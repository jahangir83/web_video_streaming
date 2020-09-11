const express = require('express')
const cors = require('cors')
const bodyPaser = require("body-parser")
const app = express()
const http = require('http').createServer(app)
const bcrypt = require('bcrypt')
//mongodb
var mongodb = require('mongodb')
const { read } = require('fs')
var mongoCliend = mongodb.MongoClient;
var ObjectId = mongodb.ObjectId
console.log(ObjectId)
//express-session
const expressSession = require("express-session");
app.use(expressSession({
    "key": "user_id",
    "secret": "User secret Object Id",
    "resave":true,
    "saveUninitialized": true

}))
//

    mongoCliend.connect("mongodb://localhost:27017", function (error, client) {
        database = client.db("my_video_streaming");
const formidable = require('formidable')
const fileSystem = require('fs')
const {getVideoDurationInSeconds } = require('get-video-duration')

// a function to user's document
 function getUser(id, callBack) {
    database.collection("users").findOne({
        "_id": ObjectId(id)
    }, function (error, userdata) {
            callBack(userdata)
        })
}


//bodypaser
app.use(bodyPaser.urlencoded({ extended: true, limit: "10000md", parameterLimit: 1000000 }))
app.use(bodyPaser.json({
    limit: "10000md"
}))


app.use("/publick", express.static(__dirname + "/publick"))

app.set("view engine", "ejs");
http.listen(3000, () => {
    console.log(`Server started. 3000`)


        app.get('/', (req, res) => {
            database.collection("videos").find({}).sort({
                "createdAt":-1
            }).toArray(function (error, videos) {
                res.render('index', {
                    "isLogin": req.session.user_id ? true : false,
                    "videos": videos
                })               
            })

        })

        app.get("/signup", (req, res) => {
            res.render("signup")
        })

        app.post("/signup", function (req, res) {
        
            //Check if email alreredy exits
            database.collection("users").findOne({
                "email": req.body.email
            }, function (error, user) {
                if (user == null) {
                    //not exits

                    //conver password to hash
                    bcrypt.hash(req.body.password, 10, function (error, hash) {
                        database.collection("users").insertOne({
                            "name": req.body.name,
                            "email": req.body.email,
                            "password": hash,
                            "coverPhoto": "",
                            "image": "",
                            "subcriptions": [], // channels I have subcribed
                            "playlist": [],
                            "videos": [],
                            "history": [],
                            "notifications": []
                        }, function (error, data) {
                            res.redirect("/login")
                        });
                    });
                } else {
                    //exits
                    res.send("Email alredy exits")
                }
            });
        });
        //login
        app.get("/login", function (req, res) {
            res.render("login", {
                "error": "",
                "massage":""
            });
        });
        //login post
        app.post("/login", function (req, res) {
            //check if email exitst

            database.collection("users").findOne({
                "email": req.body.email
            }, function (error, user) {
                    if (user == null) {
                        res.send("Email dose not exists");
                    } else {
                        //campare hased passewod

                        bcrypt.compare(req.body.password, user.password, function (error, isVeryfy) {
                            if (isVeryfy) {
                                //save user Id in session
                                req.session.user_id = user._id
                                res.redirect("/")
                            } else {
                                res.send("password is not correct")
                            }
                        })
                    }
            })
        })
        //
        app.get("/logout", function (req, res) {
            req.session.destroy();
            res.redirect("/")
        })
        //
        app.get("/upload", function (req, res) {
            if (req.session.user_id) {
                //create new page for upload
                res.render("upload", {
                    "isLogin":true
                })
            } else {
                res.redirect("/login")
            }
        })
        //
    app.post("/upload-video", function (req, res) {
        if (req.session.user_id) {
                
            var formData = new formidable.IncomingForm();
            formData.maxFieldsSize = 1000 * 1024 * 1024
            formData.parse(req, function (error, fields, files) {
                var title = fields.title
                var description = fields.description
                var tags = fields.tags
                var category = fields.category

                var oldPathThumbnail = files.thumbnail.path;
                var thumbnail = "publick/thumbnails/" + new Date().getTime() + "_" + files.thumbnail.name
                    
                fileSystem.rename(oldPathThumbnail, thumbnail, function (error) {
                    //
                });

                var oldPathVideo = files.video.path
                var newPath = "publick/videos/" + new Date().getTime() + "_" + files.video.name
                    
                fileSystem.rename(oldPathVideo, newPath, function (error) {
                    // get user data to save in video document

                    getUser(req.session.user_id, function (user) {
                        var currentTime = new Date().getTime();
                            
                        //get video duration
                        getVideoDurationInSeconds(newPath).then(function (duration) {
                            var hours = Math.floor(duration / 60 / 60);
                            var minutes = Math.floor(duration / 60) - (hours * 60)
                            var seconds = Math.floor(duration % 60);

                            //insert in database
                                
                            database.collection("videos").insertOne({
                                    
                                "users": {
                                    "_id": user._id,
                                    "name": user.name,
                                    "image": user.image,
                                    "subcribers": user.subcribers,
                                },
                                    
                                "filePath": newPath,
                                "thumbnail": thumbnail,
                                "title": title,
                                "description": description,
                                "tags": tags,
                                "category": category,
                                "createAt": currentTime,
                                "minutes": minutes,
                                "seconds": seconds,
                                "watch": currentTime,
                                "views": 0,
                                "playlist": "",
                                "likers": [],
                                "dislikers": [],
                                "comments": []
                            }, function (error, data) {
                                //insert in users collections too

                                database.collection("users").updateOne({
                                    "_id": ObjectId(req.session.user_id)
                                }, {
                                    $push: {
                                        "videos": {
                                            "_id": data.insertedId,
                                            "title": "title",
                                            "views": 0,
                                            "thumbnail": thumbnail,
                                            "watch": currentTime
                                        }
                                    }
                                });

                                res.redirect('/');
                            });
                        });
                    })
                })
            });

        } else {
            res.redirect("/login")
        }
    });
    //
    app.get("/watch/:watch", function (req, res) {
        database.collection("videos").findOne({
            "watch": parseInt(req.params.watch)
        }, function (error, video) {
                if (video == null) {
                res.send("video dose not exists")
                } else {
                    res.render("video-page/index", {
                        "isLogin": req.session.user_id ? true : false,
                        "video": video
                    })
            }
        });
    });
    //

    });
});