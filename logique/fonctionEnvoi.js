const envoyeremail = require("./envoyeremail/envoi");


const envoyer=async(email,subject,message,res)=>{



    try {


        await envoyeremail(email,subject,message);
        res.send("code envoyé avec succes,veuillez verifier");



    } catch (error) {


       console.log(error);
       res.send("une erreur est servenue"); 
    }

}



module.exports=envoyer;