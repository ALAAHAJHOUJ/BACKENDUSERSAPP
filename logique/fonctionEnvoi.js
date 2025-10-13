
const util=require('util');


const insererCodeVerification=async (conn,code,user)=>{
        const tempsEnvoi=new Date();
        const sql=`insert into Code (code,dateinsertion,userid) values ("${code}","${tempsEnvoi.toISOString().slice(0,19).replace('T',' ')}",${user.id})`;


        conn.query=util.promisify(conn.query);
        
        let rows=await conn.query(sql);
        console.log(rows)

}






const envoyer=async(email,subject,message,res,conn,code,user)=>{



    try {
       //recuperer la date d'insertion du code dans la base de données

        console.log(code)
        await insererCodeVerification(conn,code,user);

        //await envoyeremail(email,subject,message);
        res.send("code envoyé avec succes,veuillez verifier");


    } catch (error) {


       console.log(error);
       res.send("une erreur est servenue 1"); 
    }

}



module.exports=envoyer;