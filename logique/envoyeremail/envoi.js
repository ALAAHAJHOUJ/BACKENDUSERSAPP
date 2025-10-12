const nodemailer=require('nodemailer');

const envoyeremail=async (email,subject,message)=>{
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
    from:"alaa.spread#gmail.com",
    to:"alaa.spread@gmail.com",
    subject:"envoi de mail",
    text:"hey hajhouj it's me again"
})


}


module.exports=envoyeremail;