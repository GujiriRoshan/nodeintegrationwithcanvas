const express = require("express");
const multer = require("multer");
const dotenv = require("dotenv").config();
const cors = require("cors");
const ejs = require("ejs");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const carbone = require("carbone");
var convertapi = require('convertapi')('xAhHvC71xhmbCZXR');
const app = express();
app.use(cors());
// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
// parse application/json
app.use(express.json());
app.use(express.static(path.join(__dirname, "allDocuments")));
app.use(express.static(path.join(__dirname, "templates")));
app.use(express.static(path.join(__dirname, "outputFile")));
app.use(express.static(path.join(__dirname, "views")));
app.set("view engine", "ejs");
let isAuthenticated = false;
let isdocumentVisible = false;

var consumerSecretApp ="F3082FEC27083F51AEABE1CD86E45AAABEE3C9E58E51D452D7413E6B4073DC53";

console.log("consumer secret - " + consumerSecretApp);

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS"
  );
  next();
});

app.get("/", async (req, res) => {
  const directory = "templates";

  fs.readdir(directory, (err, files) => {
    if (err) throw err;

    for (const file of files) {
      fs.unlink(path.join(directory, file), (err) => {
        if (err) throw err;
      });
    } 
  });
  res.render("index.ejs", {
    isAuthenticated:false,
    isdocumentVisible
  });
});

const addFileMetaData = (fileName,outputFile) => {
  let usersjson = fs.readFileSync("file.json", "utf8");
  let users = JSON.parse(usersjson || "[]");

  const lastItem = [...users].pop();

  if (lastItem == undefined) {
    users.push({
      id: 1,
      filename: fileName,
      outputFileName:outputFile,
      createdAt: Date.now(),
    });
    usersjson = JSON.stringify(users);
    fs.writeFileSync("file.json", usersjson, "utf-8");
  } else {
    users.push({
      id: lastItem.id + 1,
      filename: fileName,
      outputFileName:outputFile ,
      createdAt: Date.now(),
    });

    usersjson = JSON.stringify(users);
    fs.writeFileSync("file.json", usersjson, "utf-8");
  }
  const lastIdcall = users.pop();
  return lastIdcall;
};

//multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    var dir = "./templates";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

app.post("/addtemplate", upload.single("template"), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.json({
        error: "Use the form data",
      });
    }
    const fileName = file.originalname
    const lastIndex = fileName.lastIndexOf(".");
    const Stringlength = fileName.length;
    const output =fileName.substr(0, lastIndex)+fileName.substr(Stringlength);
    console.log(output);
    await convertapi.convert('pdf', { File: `./templates/${file.originalname}` })
    .then(async(result)=> {
      // get converted file url
       console.log("Converted file url: " + result.file.url);
     await result.file.save(`./templates/${output}.pdf`);//save the file

    })
    console.log("outside");
    let  outputFileName = `${output}.pdf`
     const templateId = addFileMetaData(file.originalname,outputFileName);
     isAuthenticated = true;
    return res.render("index", {
     outputFileName:`${output}.pdf`,
      templateId: templateId.id,
      fileName: templateId.filename,
      isAuthenticated,
      isdocumentVisible,
      data:null
    });
  } catch (err) {
    console.log(err);
  }
});

app.post("/generateDocumentCanvas", (req, res, next) => {
  var data = {
    ...req.body,
  };

  var payload = JSON.parse(data.data);
  const templateId = payload.config.templateId;
  const fileData = fs.readFileSync("file.json").toString();
  const dataList = JSON.parse(fileData);

  dataList.forEach((list) => {
    if (list.id === templateId) {
      const lastIndex = list.filename.lastIndexOf(".");
      const Stringlength = list.filename.length;
      const output =list.filename.substr(0, lastIndex) + list.filename.substr(Stringlength);
      console.log(output);
      carbone.render(
        `./templates/${list.filename}`,
        payload.data,
        payload.options,
        function (err, result) {
          if (err) {
            console.log(err);
          }
          fs.writeFileSync(
            `templates/${output}.${payload.options.convertTo}`,
            result
          );
          isAuthenticated = true;
          isdocumentVisible=true
          // fs.unlinkSync(`./templates/${list.filename}`);
          console.log(payload)
          return res.render("index", {
            fileName: `${output}.${payload.options.convertTo}`,
            templateId:list.id,
            isAuthenticated,
            isdocumentVisible,
            data: JSON.stringify(payload,null,'\t')
          });
        }
      );
    }
    return 
  });
});

app.post("/signedRequest", function (req, res) {
  var bodyArray = req.body.signed_request.split(".");
  var consumerSecret = bodyArray[0];
  var encoded_envelope = bodyArray[1];

  var check = crypto
    .createHmac("sha256", consumerSecretApp)
    .update(encoded_envelope)
    .digest("base64");

  if (check === consumerSecret) {
    var envelope = JSON.parse(
      new Buffer.from(encoded_envelope, "base64").toString("ascii")
    );
    res.render("index", { isAuthenticated });
  } else {
    res.send("authentication failed");
  }
});

app.post("/convert", async (req, res) => {
  const payload = {
    ...req.body,
  };
  // carbone.render('./templates/abc.docx',payload.data,{convertTo:"pdf"},async(err,resp)=>{
  //     if(err){console.log(err)}
  await fs.readFile("./templates/job offer letter.odt", async (err, result) => {
    if (err) {
      console.log(err);
    }
    console.log(result);
    await carbone.convert(result, payload.options, (err, filedata) => {
      if (err) {
        console.log(err);
      }

      fs.writeFileSync(`invoice.pdf`, filedata);
    });
  });
  // })
});

// convertapi.convert('pdf', { File: './templates/job offer letter.odt' })
//   .then(function(result) {
//     // get converted file url
//     console.log("Converted file url: " + result.file.url);

//     // save to file
//     return result.file.save('./templates/result.pdf');
//   })
//   .then(function(file) {
//     console.log("File saved: " + file);
//   })
//   .catch(function(e) {
//     console.error(e.toString());
//   });


const port = process.env.port || 4500;
app.listen(port, () => {
  console.log(`app listening on port ${port}`);
});
