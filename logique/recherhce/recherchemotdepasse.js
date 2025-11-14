const crypter=require('bcrypt');
const jwt=require('jsonwebtoken');



const rechercher=async(res,pass,resp1)=>{

       for(let i=0;i<res.length;i++)
        {
                    const result = await crypter.compare(pass,res[i].motdepasse);
                    console.log(result);


                    if(result) {//ici on va faire tout le travaille (authentification)
                    console.log("utilisateur existe dans la base de données");
                    const token=jwt.sign({id:res[i].id,nom:res[i].nom,prenom:res[i].prenom},"jwt-secret-key",{expiresIn:"1d"})
                    resp1.cookie('token',token);
                    
                    return resp1.send("utilisateur existe dans la base données et voici le token");

                    }


        }


        

resp1.send("utilisateur n'existe pas");  // si on arrive a ce stade la c'est a dire que l'utilisateur n'existe pas dans labase données


}


module.exports=rechercher;