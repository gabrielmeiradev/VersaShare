"use strict";
const nodemailer = require("nodemailer");

async function main(to, message) {
  let testAccount = await nodemailer.createTestAccount();
  let transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, 
    auth: {
      user: testAccount.user, 
      pass: testAccount.pass, 
    },
  });

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: 'Confirme sua conta VersaShare', // sender address
    to: to, // list of receivers
    subject: "Ativação da conta VersaShare", // Subject line
    text: message.plain, // plain text body
    html: message.html, // html body
  });

  console.log("Message sent: %s", info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}

module.exports = main;