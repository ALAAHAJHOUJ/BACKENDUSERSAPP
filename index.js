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



app.use(cookieParser());//middelewre de parse de cookies 


app.use(cors());//autoriser les requetes

app.use(express.json());//middelwere pour forma Json


//pour personnaliser le nom de l'image telechargée
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('je suis executé'+req.Value)
    cb(null, './upload')
  },
  filename: function (req, file, cb) {
    cb(null,req.Value+".png");
  }
})



const upload=multer(storage);//middelwere pour formdata (fichiers)



const middelwereError=(err,req,res,next)=>{//middelwere de gestion d'erreurs
console.log(err)
res.send(err.message);
}











const verifierUser=(req,res,next)=>{ //fonction de verification de l'utiliateur s'il est authentifié ou non

  const token1=req.cookies.token;
  console.log(token1);
  if(!token1)
      {
        return res.json({Error:'non authentifié'})
      }
      else 
      {
        jwt.verify(token1,"jwt-secret-key",(err,decoded)=>{
          if(err) {console.log('probleme dans le token');console.log(err);return res.send("probleme dans le token")}
          req.name=decoded;
          console.log(decoded);
          next();
        })
      }



}










const routeMiddleware=async(req, res, next)=> {//middelwere qui sera executé avant l'upload de l'image

  try {
        const sql="select * from Admine";
        

        conn.query=util.promisify(conn.query);
        const rows=await conn.query(sql);
        const nombreLignes=rows.length+1;
        const nomImage="image"+nombreLignes;
        req.Value=nomImage;
        next();
  } catch (error) {
        console.log(error);
        res.send("une erreur est servenue");
  }



}






app.get('/',verifierUser,(req,res)=>{
res.send(req.name);
})




app.post("/inscription/",routeMiddleware,upload.single('image'),async(req,res)=>{

          try {
            const recherche=`select * from Admine where email="${req.body.email}"`;
            const motdepasse=req.body.password;
            console.log(req.Value);

            conn.query=util.promisify(conn.query);
            const rows=await conn.query(recherche);



            if(rows!=0)
            {
              res.send("l'email existe déja dans la base de données")
            }

            else 
            {
            //cryptage du mot de passe
            const crypter=crypter1(motdepasse);
            console.log("voila"+crypter);
            const nomImage=req.Value;
            const inserstion=`insert into Admine (nom,prenom,image,motdepasse,email) values ("${req.body.nom}","${req.body.prenom}","${nomImage}","${crypter}","${req.body.email}")`
            conn.query=util.promisify(conn.query);
            await conn.query(inserstion);
            console.log("enregistrement avec succes");
            res.send("enregistrement avec succes");
          
            }
          } catch (error) {
            console.log(error);
            res.send("une erreur est servenue")
          }


})






app.post("/Login",async (req,res)=>{//endpoint de l'autentification
    const {nom,password}=req.body;//recuperer les données utilisateur
    console.log(nom,password);


    const rechercher=`select * from Admine where nom="${nom}"`; //recuperer tous les lignes de la table qui contient le nom saisie par l'utilisateur        


    try {
      conn.query=util.promisify(conn.query);
      const rows=await conn.query(recherche);
      if(rows.length!=0)
      {
      recherche(rows,password,res);
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
    res.send("logout avec succes");
    } catch (error) {
      console.log(error);
      res.send("une erreur est servenue");
    }



})    





app.post("/envoiducode",async(req,res)=>{  //endpoint d'envoi du code par email a l'utilisateur

  const {email}=req.body;
  const sql=`select * from Admine where email="${email}"`;

    try {
        conn.query=util.promisify(conn.query);

        const rows=await conn.query(sql);
        if(rows.length!=0)
        {
            console.log(resultat);
            const nombre=Math.floor(100000+Math.random()*999999);//generer un nombre aléatoire 
            const codeverification=`ton code de verification est ${nombre}`;
            await envoyer(email,"renitialiser mot de passe",codeverification,res,conn,nombre+"",resultat[0]);
        }

        else 
        {    
             console.log("utilisateur inexistant dans la base de données ");
             res.send("cet email n'existe pas ");  
        }
    } catch (error) {
        console.log(error);
        res.send("une erreur est servenue")
    }

})








app.post("/veirifiercode",async(req,res)=>{  //endpoint de verification du code saisie par le client

  const code=req.body.code;


  if(!code) // c'est ici qu on va faire tout le travaille  de verification du code
  {
   try {
      conn.query=util.promisify(conn.query);
      const rows=await conn.query(`select * from Code where code="${code}"`);
      if(rows.length!=0)
      {
       const date1=new Date(rows[0].dateinsertion);
       const maintenant=new Date();
       if(maintenant-date1<60*1000*60){//ici on va envoyer un message d'autorisation si la difference de la date d'insertion et la date d'envoi de la demande est inférieure a 1h 
         res.send("autorisé a modifier le mot de passe")
       }
       else 
       {
        res.send("le code est expirée")
       }
       
      }
      else 
      {
        res.send("code n'existe pas dans la base de données")
      }
      
   } catch (error) {
     console.log(error);
     res.send("une erreur est servenue")
   }

   
  }
  else{
    res.send('code requis dans la demande')
  }
})








app.post("/actualiserMotdepasse",async(req,res)=>{//endpoint d'actualisation du mot de passe de l'utilisateur

const {iduser,nouveaupassword,code}=req.body;
const sql=`select * from Code where code="${code}" and userid="${iduser}"`;

try {
    conn.query=util.promisify(conn.query);
    const rows=await conn.query(sql);
    if(rows.length!=0)
    {

      const dateinsertion=rows[0].dateinsertion;
      if(new Date().now-new Date(dateinsertion)<60*60*1000)  //okk on va actualiser le mot de passe de l'utilisateur
      {
      const hasher=crypter1(nouveaupassword);
      const sql=`update Admine set motdepasse="${hasher}" where id="${iduser}"`;
      await conn.query(`DELETE FROM Code WHERE code ="${code}" and userid="${iduser}" `);  //supprimer la ligne de la table car le code est déja utilisé
      await conn.query(sql);
      }
      else 
      {
        res.send("code expirée")
      }
    }else 
    {
      res.send("aucune code trouvé")
    }
} catch (error) {
  console.log(error);
  res.send("une erreur est servenue");
}


})









app.use((req,res,next)=>{  //midelewere de gestion des routes qui n'existent pas
  const error=new Error();
  error.message="aucune route n'est trovée"
  next(error);
})




app.use(middelwereError);//gerer les erreurs si un middelewere est arreté pour une certaine raison



app.listen(8000,()=>{
    console.log('server is running on port 8000');
})