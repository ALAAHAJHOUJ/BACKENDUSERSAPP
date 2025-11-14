const nodemailer=require('nodemailer');

const envoyeremail=async (email,code)=>{

       const emailtarget=email;

        const transporter=nodemailer.createTransport({
            host:"smtp.gmail.com",
            port:587,
            secure:false,
            auth:{
                user:"alaa.spread@gmail.com",
                pass:"cfqa jhlm tsxf afqm"
            }
        })



        await transporter.sendMail({
            from:"alaa.spread@gmail.com",
            to:emailtarget,
            subject:"envoi de mail",
            text:"le code de vérification est:"+code
        })


}


module.exports=envoyeremail;