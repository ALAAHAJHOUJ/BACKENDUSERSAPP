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

app.use(cookieParser());//middelewre de parse de cookies


app.use(cors({origin:process.env.URL,credentials:true})); //autoriser les requetes et les cookies pour le navigateur

app.use(express.json());//middelwere pour forma Json


//pour personnaliser le nom de l'image telechargée
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('je suis executé'+req.Value)
    cb(null, './upload/')
  },
  filename: function (req, file, cb) {
    cb(null,req.Value+".png");
  }
})



const upload=multer({storage});  //middelwere pour formdata (fichiers)








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
          next();
          }

        })
      }



}




















app.get('/',verifierUser,(req,res)=>{  //endpoint de verifcation de l'authenticité de l'utilisateur
res.send({contenu:req.name,message:"authentifié"});
})






const routeMiddleware=async(req, res, next)=> {  //middelwere qui sera executé avant l'upload de l'image pour nommer l'image telechargée

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







//endpoint  d'inscription 
app.post("/inscription/",routeMiddleware,upload.single('image'),async(req,res)=>{
          
          try {
            const recherche=`select * from Admine where email="${req.body.email}"`;
            const motdepasse=req.body.password;
            console.log(req.Value);

            conn.query=util.promisify(conn.query);
            const rows=await conn.query(recherche);


            console.log(rows.length)
            if(rows.length!=0)
            {
              fs.unlink(`./upload/${req.Value}.png`,(err)=>{  //supprimer l'image telechargée, ca sert a rien de la garder
                if(err) {console.log(err); return res.send("une erreur s'est produite")}
              })
              return res.send("l'email existe déja dans la base de données");

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
            return res.send("enregistrement avec succes");
          
            }
          } catch (error) {
            console.log(error);
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

const sql=`select * from Usernormale where id_admine=${req.name.id}`
const rows=await conn.query(sql,(err,resultat)=>{
  if(err) {console.log(err); return res.send("une erreur est servenue")}

  else 
  {
    console.log(resultat);
    const a=JSON.stringify(resultat)
    return res.send(resultat);
  }
})
})






app.post("/supprimerUser",verifierUser,async(req,res)=>{  //endpoint de suppression d'un utilisateur
    //opértaion de suppression dans la base de données


    try {
        conn.query=util.promisify(conn.query);
        const resultat=await conn.query(`select * from Usernormale where id_user=${req.body.id} and id_admine=${req.name.id}`);

        console.log(req.body.id);
        console.log(req.name.id)

        fs.unlink(`./upload/${resultat[0].image}.png`,(err)=>{  //supprimer l'image telechargée, ca sert a rien de la garder
            
          if(err) {console.log(err); return res.send({message:"une erreur s'est produite"})}
             
        })


        conn.query=util.promisify(conn.query);
        const sql=`delete from Usernormale where id_admine=${req.name.id} and  id_user=${req.body.id}`;
        await conn.query(sql);

        return res.send({message:"opération avec succes"})
    } catch (error) {
      console.log(error);
      return res.send({message:"une erreur s'est produite"})
    }

})








const nommerImageUSER=async(req,res,next)=>{  //middelewere qui nomme l'image de l'utilisateur avant la telecharger
const sql=`select * from Usernormale`;

conn.query=util.promisify(conn.query);

try {
        const rows= await conn.query(sql);
        //on va maintenant nommer l'image avant la stocker dans le systeme de fichiers
        
        console.log("le nombre de lignes dans la table d'utilisateurs est:",rows.length);
        const nombreLignes=rows.length+1+'';
        const nomImage="imageUser"+nombreLignes;
        req.Value=nomImage;

        next();

} catch (error) {
        console.log(error);
        return res.send("une erreur est servenue");
}

}






app.post("/AjouterUser",verifierUser,nommerImageUSER,upload.single('image'),async(req,res)=>{ //endpoint d'ajout d'un utilisateur
console.log(req.body);
//ajout de l'utilisteur commence ici


//verifier d'abord l'email et le téléphone
const sqlEmailTel=`select * from Usernormale where (email="${req.body.email}" or telephone="${req.body.telephone}") and id_admine=${req.name.id}`;
conn.query=util.promisify(conn.query);

try {
      const rows=await conn.query(sqlEmailTel);
      console.log(rows.length);

      if(rows.length==0)  //on va ajouter l'utilisateur dans la base de données
      {
       const ajout=`insert into Usernormale (nom,prenom,email,image,telephone,id_admine) values ("${req.body.nom}","${req.body.prenom}","${req.body.email}","${req.Value}","${req.body.telephone}",${req.name.id})`
       const rows=await conn.query(ajout);
       console.log(rows)
       return res.send("succes")
      }
      else 
      {
        return res.send("numéro ou email déja existe dans la base données")
      }

} catch (error) {
  console.log(error);
  return res.send("hey hey hajhouj")
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






app.get("/recupererImageUser/:idUser",verifierUser,async(req,res)=>{
  console.log(req.params.idUser);

  const nomImage=`select * from Usernormale where id_user=${req.params.idUser} and id_admine=${req.name.id}`

  try {
    
    conn.query=util.promisify(conn.query);

    const rows=await conn.query(nomImage);

    if(rows.length)
    {
      //on va recuperer l'image et l'envoyer
       if (fs.existsSync(`./upload/${rows[0].image}.png`))
          {


                  res.sendFile(path.join(__dirname,'upload/',`${rows[0].image}.png`));
                  console.log("tous est bon")

          }
          else 
          {
          console.log("image n'existe pas");
          return res.send("image n'existe pas dans le systeme de fichiers")
          }

    }else {
      console.log("utilisateur inexistant")

      return res.send("utilisateur inexistant")
    }

  
  } catch (error) {
    console.log(error)
    res.send("une erreur est servenue")
  }
})





 
app.get("/recupererImage/:name",verifierUser,async(req,res)=>{   //endpoint de récupération de l'image téléchargée
  //il faut d'abord verifier que l'image existe dans le systeme de fichiers
  console.log(req.params.name)
  console.log("l'id de l'utilisateur est:"+req.name.id)
  const nomImage=`select * from Admine where id=${req.name.id}`

  try {
       conn.query=util.promisify(conn.query);
       const rows=await conn.query(nomImage);
       console.log(rows[0].image)
       if (fs.existsSync(`./upload/${rows[0].image}.png`))
          {


                  res.sendFile(path.join(__dirname,'upload/',`${rows[0].image}.png`));
                  console.log("tous est bon")

          }
          else 
          {
          console.log("image n'existe pas");
          res.send("image n'existe pas dans le systeme de fichiers")
          }
  } catch (error) {
      console.log(error);
      return res.send("une erreur est servenue")
  }
})





async function supprimer(paths)  //fonction de suppression des images des utilisateurs 
{
   await Promise.all(paths.map(path => fs1.unlink(path)));
}







app.get('/supprimerProfile/',verifierUser,async(req,res)=>{  //endpoint de suppression du profile

try {

         //recuperer le nom de l'image de cet utilisateur
         conn.query=util.promisify(conn.query);
         const recuperImage=`select * from Admine where id=${req.name.id}`;
         const resultat=await conn.query(recuperImage);

         
        //supprimer les images des utilisateurs asscoiés
        const recupererImages=`select * from Usernormale where id_admine=${req.name.id}`;
        const rows2=await conn.query(recupererImages);
 
        const paths=[];
        for(let i=0;i<rows2.length;i++)
        { 
        paths.push(`./upload/${rows2[i].image}.png`);
        }
        await supprimer(paths);



        //supprimer l'image de l'utilisateur

        fs.unlinkSync(`./upload/${resultat[0].image}.png`)
        console.log("image supprimée")




        //query de suppression  des utilisateurs associés a cet utilisateur
        const supprimerUsers=`delete from Usernormale where id_admine=${req.name.id}`;
        const rows1=await conn.query(supprimerUsers);



        //query pour supprimer l'utilisateur
        const supprimerUser=`delete from Admine where id=${req.name.id}`;
        const rows=await conn.query(supprimerUser);

        




        //supprimer les cookies 
        res.clearCookie('token');


        //envoyer un message de reussite;
        return res.send('opértaion passée avec succes');


} catch (error) {
  console.log(error);
  return res.send("une erreur est servenue ")
}

})






app.post("/ModifierProfile/",verifierUser,async(req,res)=>{      //endpoint de modification du profile
console.log("modifier l'utilisateur");
const {nom,prenom,email,password}=req.body

try {
      const recherche=`select * from Admine where id!=${req.name.id} and (email="${req.body.email}")`;

      conn.query=util.promisify(conn.query);

      const rows=await conn.query(recherche);

      if(rows.length!=0)
      {
      console.log('email existe dans la base de données');

      return res.send("email existe dans la base données");
}
else  //ici on va commncer la modification de l'utilisateur en se basant sur les valeurs saisies par lui
{
      
      let requete=``
      if(req.body.nom)
          {
          requete+=`update Admine set nom="${req.body.nom}"`
          }

      if(req.body.prenom)
          {
          requete+=` ,prenom="${req.body.prenom}"`
          }

      if(req.body.email)
          {
          requete+=` ,email="${req.body.email}"`
          }
      if(req.body.password)
          {
           //on va crypter le mot de passe avant le stocker dans la base de données
           const motdepasse=crypter1(req.body.password+"")
           console.log(motdepasse)
           requete+=` ,motdepasse="${motdepasse}" where id=${req.name.id}`

          }
      const rows=await conn.query(requete);

      console.log('opération passée avec succes');
      return res.send("opération passée avec succes");
}

} catch (error) {
    console.log(error);
    return res.send("une erreur est servenue");
}

})






const nommerImageModifie=async(req,res,next)=>{
      const recupererNomImge=`select * from Admine where id="${req.name.id}"`


      try {
      conn.query=util.promisify(conn.query);

      const rows=await conn.query(recupererNomImge);

      console.log(rows[0].image);

      req.Value=rows[0].image;

      req.nouveauNom=rows[0].nom;

      req.nouveauPrenom=rows[0].prenom;


      //on va maintenant supprimer l'image ancienne
        fs.unlinkSync(`./upload/${rows[0].image}.png`); 
        console.log('image supprimée');

        next();
      } catch (error) {
        console.log(error);
        res.send("une erreur est servenue")
      }

}








app.post("/modifierImage",verifierUser,nommerImageModifie,upload.single('image'),(req,res)=>{//endpoint de modification de l'image

  console.log('modifier Image')
  //si on est arrivé a ce stade la c'est a dire tout s'est passé avec succes

  res.clearCookie("token");

  const token=jwt.sign({id:req.name.id,nom:req.nouveauNom,prenom:req.nouveauPrenom},"jwt-secret-key",{expiresIn:"1d"})
  res.cookie('token',token);
  res.send("image modifiée")
  
})








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