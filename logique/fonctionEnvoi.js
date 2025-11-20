
const util=require('util');
const envoyeremail = require('./envoyeremail/envoi');


const insererCodeVerification=async (conn,code,email)=>{
        const tempsEnvoi=new Date();
        const sql=`insert into Code (code,dateinsertion,email) values ("${code}","${tempsEnvoi.toISOString().slice(0,19).replace('T',' ')}","${email}")`;


        conn.query=util.promisify(conn.query);
        
        let rows=await conn.query(sql);
        console.log(rows)

}






const envoyer=async(email,res,conn,code)=>{



    try {

        console.log(code)
        await insererCodeVerification(conn,code,email,code);

        await envoyeremail(email,code);
        res.send("code envoyé avec succes,veuillez verifier");


    } catch (error) {


       console.log(error);
       res.send("une erreur est servenue 1"); 
    }

}



module.exports=envoyer;