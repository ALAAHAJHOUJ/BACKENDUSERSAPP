require("dotenv").config()
const express=require("express");
const app=express();
const cors=require('cors')
const conn=require("./basededonnes/db");
const crypter1 = require("./logique/hash");
const comparer = require("./logique/comparer");
const multer=require('multer');
const crypter2=require('bcrypt');
const recherche=require('./logique/recherhce/recherchemotdepasse')
const cookieParser = require("cookie-parser")
const jwt=require('jsonwebtoken');
const envoyeremail = require("./logique/envoyeremail/envoi");
const envoyer = require("./logique/fonctionEnvoi");
const util=require("util");
const fs = require('fs');
const path = require('path');
const fs1 = require('fs').promises;
const telechargerImage=require("./upload/upload");
const { IncomingMessage } = require("http");
const { useFunc } = require("ajv/dist/compile/util");


app.use(cookieParser());//middelewre de parse de cookies
app.use(cors({origin:process.env.URL,credentials:true})); //autoriser les requetes et le controlle des cookies pour le navigateur
app.use(express.json());//middelwere pour forma Json










const upload = multer({ storage: multer.memoryStorage() });//pour lire les demandes de formdata








const verifierUser=(req,res,next)=>{ //fonction de verification de l'utiliateur s'il est authentifié ou non
  
  const token1=req.cookies.token;
  console.log(token1)

      if(!token1)
      {
        return res.send({message:'non authentifié'})
      }
      else 
      {
        jwt.verify(token1,"jwt-secret-key",(err,decoded)=>{
          if(err) {console.log('probleme dans le token');console.log(err);return res.send({message:"probleme dans le token"})}
          else
          {       
          req.name=decoded;
          console.log(req.name)
          console.log("oui baby")
          next();
          }

        })
      }



}







app.get('/',verifierUser,(req,res)=>{  //endpoint de verifcation de l'authenticité de l'utilisateur
res.send({contenu:req.name,message:"authentifié"});
})






//endpoint  d'inscription 
app.post("/inscription/",upload.single('image'),async(req,res)=>{
          
          try {
                    const recherche=`select * from Admine where email="${req.body.email}" or image="${req.body.username}"`;
                    const motdepasse=req.body.password;

                    conn.query=util.promisify(conn.query);
                    const rows=await conn.query(recherche);


                    if(rows.length!=0)
                    {
                          return res.send("l'email ou le nom d'utilisateur  existe déja dans la base de données");
                    }

                    else //ici on va commencer a enregistrer l'utilisateur dans notre plateform
                    {

                            if(!req.file){
                                console.log("fichier inexistant")
                                return res.send("fichier requis dans la demande")
                            }
                            //cryptage du mot de passe
                            const crypter=crypter1(motdepasse);
                            console.log("voila"+crypter);
                            const inserstion=`insert into Admine (nom,prenom,image,motdepasse,email) values ("${req.body.nom}","${req.body.prenom}","${req.body.username}","${crypter}","${req.body.email}")`
                            conn.query=util.promisify(conn.query);
                            await conn.query(inserstion);
                            
                            //maintenant on va telecharger l'image de l'utilisateur dans cloudinary

                              const base64 = req.file.buffer.toString("base64");
                              const dataURI = `data:${req.file.mimetype};base64,${base64}`;

                              const result = await telechargerImage.uploader.upload(dataURI, {
                              public_id:req.body.username  // <— nom du fichier
                              });       
                              
                              console.log("opération passée avec succes")

                              return res.send("enregistrement avec succes")
                    }
          }catch (error) {
                    console.log(error)
                    res.send("une erreur est servenue")
          }


})








app.post("/Login",async (req,res)=>{ //endpoint de l'autentification
    console.log(req.body)
    const {nom,password}=req.body;  //recuperer les données utilisateur
  
    


    const rechercher=`select * from Admine where nom="${nom}"`; //recuperer tous les lignes de la table qui contient le nom saisie par l'utilisateur        


    try {
      conn.query=util.promisify(conn.query);
      const rows=await conn.query(rechercher);
      if(rows.length!=0)
      {
      const a=await recherche(rows,password,res);
      }
      else 
      {
        res.send("utilisateur n'existe pas")
      }

    } catch (error) {
      console.log(error);
      res.send("une erreur est servenue")
    }


})







app.get("/Logout",(req,res)=>{    //endpoint de déconnexion
   
   
  try {//ici on va supprimer le token du client (déconnexion)
    res.clearCookie('token');
    console.log("logout avec succes");
    return res.send("logout avec succes");
    } catch (error) {
      console.log(error);
     return  res.send("une erreur est servenue");
    }



})    








app.post("/envoiducode",async(req,res)=>{  //endpoint d'envoi du code par email a l'utilisateur

  const {email}=req.body;
  const sql=`select * from Admine where email="${email}"`;
  const supprimer=`delete from code where email="${email}"`
    try {
       conn.query=util.promisify(conn.query);
       const rows= await conn.query(sql)
        if(rows.length!=0)
        {
            await conn.query(supprimer)
            const nombre=Math.floor(10000+Math.random()*90000);//generer un nombre aléatoire de 5 chiffres
            await envoyer(email,res,conn,nombre+"");
        }

        else 
        {    
             console.log("utilisateur inexistant dans la base de données ");
             res.send("cet email n'existe pas");  
        }
    } catch (error) {
        console.log(error);
        res.send("une erreur est servenue")
    }

})










app.post("/verifiercode",async(req,res)=>{  //endpoint de verification du code saisie par le client

  const code=req.body.code;
  const email=req.body.email;

  if(code && email) // c'est ici qu on va faire tout le travaille  de verification du code
  {
   try {
      conn.query=util.promisify(conn.query);
      const rows=await conn.query(`select * from Code where code="${code}" and email="${email}"`);
      if(rows.length!=0)
      {
            const date1=new Date(rows[0].dateinsertion);
            const maintenant=new Date();
            if(maintenant-date1>60*1000*60){   //ici on va envoyer un message d'autorisation si la difference de la date d'insertion et la date d'envoi de la demande est inférieure a 1h 
              res.send("code valide et n 'est pas encore expiré")
            }
            else 
            {
              res.send("le code est expirée")
            }
       
      }
      else 
      {
            res.send("code invalide")
      }
      
   } catch (error) {
     console.log(error);
     res.send("une erreur est servenue")
   }

   
  }
  else
  {
    res.send('code et email requis dans la demande')
  }
})











app.post("/actualiserMotdepasse",async(req,res)=>{//endpoint d'actualisation du mot de passe de l'utilisateur

const {email,nouveaupassword,code}=req.body;
const sql=`select * from Code where code="${code}" and email="${email}"`;

if(!email ||!nouveaupassword ||!code)
{
  return res.send("email et code et password sont requis dans la demande")
}


try {
    conn.query=util.promisify(conn.query);
    const rows=await conn.query(sql);
    if(rows.length!=0)  //le code existe dans la base de données avec l'email de l'utilisateur concerné
    {

            const dateinsertion=rows[0].dateinsertion;  //on doit choisir la derniere ligne (le client peut envoyer plusieurs damandes a l'endpoint de l'envoi du code )
            if(new Date()-new Date(dateinsertion)>60*60*1000)  //okk on va mettre a jour le mot de passe de l'utilisateur
            {
            const hasher=crypter1(nouveaupassword);
            const sql=`update Admine set motdepasse="${hasher}" where email="${email}"`; 
            await conn.query(sql);
            console.log("mot de passe a jour ")
            res.send("mot de passe mis a jour avec succes")
            }
            else 
            {
              res.send("code expiré")
            }
    }else 

    {
             res.send("code invalide")
    }
} catch (error) {
  console.log(error);
  res.send("une erreur est servenue");
}


})










app.get("/getUsers/",verifierUser,async (req,res)=>{  //recuperer les utilisateurs 
console.log(req.name.id);
conn.query=util.promisify(conn.query);


try {
   const sql=`select * from Usernormale where id_admine=${req.name.id}`
   const rows=await conn.query(sql)

   if(rows.length!=0){
      return res.send(rows)
   }else{
      return res.send("aucun utilisateur existant ")
   }
} catch (error) {
    console.log(error)
    res.send("une erreur est servenue")
}
})








app.post("/AjouterUser",verifierUser,upload.single('image'),async(req,res)=>{ //endpoint d'ajout d'un utilisateur


  //on doit verifier d'abord que l'image existe dans la demande du client
  if(!req.file){
    console.log("fichier inexistant")
    return res.send("fichier inexistant")
  }


  try {
       const verifierUser=`select * from usernormale where email=${req.body.email} or telephone=${req.body.telephone}`
       conn.query=util.promisify(conn.query)
       const rows1=await conn.query(verifierUser)
       if(rows1!=0){
          console.log("email ou telephone déja utilisés")
          return res.send("email ou telephone déja utilisés")
       }
       const sql=`select * from usernormale where id_admine=${req.name.id}`  
       conn.query=util.promisify(conn.query)
       const rows=await conn.query(sql)//on recupere le nombre de lignes de la table Usernormale (les utilisateus associés a l'Admine)
       const nblignes=rows.length+1;
       const nomImage="Admine"+`${req.name.id}`+"User"+nblignes


       const sql1=`insert into usernormale (nom,prenom,image,telephone,email,id_admine) values("${req.body.nom}","${req.body.prenom}","${nomImage}","${req.body.telephone}","${req.body.email}","${req.name.id}")`
       await conn.query(sql1)

       //maintenant on va telecharger l'image du sous utilisateur dans cloudinary

       const base64 = req.file.buffer.toString("base64");
       const dataURI = `data:${req.file.mimetype};base64,${base64}`;
       const result = await telechargerImage.uploader.upload(dataURI, {
       public_id:nomImage  // <— nom du fichier du sous utilisateur 
       });       
                              
       console.log("opération passée avec succes")

       return res.send("enregistrement avec succes")                     
                   
  } catch (error) {
       console.log(error)
       return res.send("une erreur est servenue")
  }

})







app.post("/supprimerUser",verifierUser,async(req,res)=>{  //endpoint de suppression d'un utilisateur
    //opértaion de suppression dans la base de données

    try {
        conn.query=util.promisify(conn.query);
        const resultat=await conn.query(`select * from Usernormale where id_user=${req.body.id} and id_admine=${req.name.id}`);

        if(resultat.length==0){
          console.log("utilisateur inexisant")
          return res.send("utilisateur inexisant")
        }

        //on doit supprimer l'image du service cloudinary
        await telechargerImage.uploader.destroy(resultat[0].image)
        

        conn.query=util.promisify(conn.query);
        const sql=`delete from Usernormale where id_admine=${req.name.id} and  id_user=${req.body.id}`;
        await conn.query(sql);

        return res.send({message:"opération avec succes"})
    } catch (error) {
      console.log(error);
      return res.send({message:"une erreur s'est produite"})
    }

})






app.post('/ModifierUser/',verifierUser,async(req,res)=>{  //endpoint de modification d'un utilisateur

      console.log("modifier un utilisateur");

      conn.query=util.promisify(conn.query);


      //verifier d'abord l'email et le téléphone
      const sqlEmailTel=`select * from Usernormale where (email="${req.body.email}" or telephone="${req.body.telephone}") and (id_admine=${req.name.id} and id_user!=${req.body.idUser})`;

      try {
            const rows=await conn.query(sqlEmailTel);
            if(rows.length!=0)
            {

                console.log("email ou numéro de téléphone déja existe dans la base donées");
                return res.send("email ou num de téléphone déja existant dans la base deo données");

            }
            else   //ici on va commencer l'opération de modification de l'utilisateur
            {
              let  requet=`update Usernormale set `
              if(req.body.nom)
              {
                requet+=`nom="${req.body.nom}"`
              }
              if(req.body.prenom)
              {
                requet+=` ,prenom="${req.body.prenom}"`
              }
              if(req.body.email)
              {
                requet+=` ,email="${req.body.email}"`
              }
              if(req.body.telephone)
              {
                requet+=` ,telephone="${req.body.telephone}"`
              }
            
            conn.query=util.promisify(conn.query);
            const rows=await conn.query(requet);
            console.log("opération passée avec succes");
            return res.send('opération passée avec succes');
        }
      } catch (error) {
            console.log(error);
            return res.send("une erreur est servenue");
      }

}
)









app.use((req,res,next)=>{  //middelewere de gestion des routes qui n'existent pas
  const error=new Error();
  error.message="aucune route trovée";
  next(error);
})



const middelwereError=(err,req,res,next)=>{   //middelwere de gestion d'erreurs
console.log(err);
res.send(err.message);
}



app.use(middelwereError);   //gerer les erreurs si un middelewere est arreté pour une certaine raison





app.listen(8000,()=>{
    console.log('server is running on port 8000');
})