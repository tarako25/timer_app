const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const app = express();
app.engine("ejs", ejs.renderFile);

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));

//heroku用
app.listen(process.env.PORT || 3000, () => {
  console.log("Open Server! URL:http://localhost:3000/");
});

//Mysql設定

const mysql_setting = {
  host: "database-1.c26tz3blblk0.ap-northeast-1.rds.amazonaws.com",
  port:"3306",
  user:"admin",
  password:"0423take",
  database: "stop-app-db",
};
const mysql_setting2 = {
  host: "database-1.c26tz3blblk0.ap-northeast-1.rds.amazonaws.com",
  port:"3306",
  user:"admin",
  password:"0423take",
  database: "stop-app-acount",
};

//グローバルID

let ac;
//基本クエリ(querynormal)

function querynormal(connection,res){
  connection.query(`SELECT * from ${ac}`, function (error, results, fields) {
    if (error == null) {
      const element = results;

      connection.query(`SELECT SUBSTRING(SEC_TO_TIME(SUM(TIME_TO_SEC(time))), 1, 8) AS total_time FROM ${ac}`, function(error, results, fields) {
        if (error == null){
          const sum = results[0].total_time;

          //今日の日付取得
          const currentDate = new Date;
          const year = currentDate.getFullYear();
          const month = ("0" + (currentDate.getMonth() + 1)).slice(-2);
          const day = ("0" + currentDate.getDate()).slice(-2);

          const month2 = (currentDate.getMonth() + 1);

          //yesterday用
          const oldday = ("0" + (currentDate.getDate()-1)).slice(-2);

          const today = year + '/' + month + '/' + day;
          const yesterday = year + '/' + month + '/' + oldday;
          
          
          connection.query(`SELECT SUBSTRING(SEC_TO_TIME(SUM(TIME_TO_SEC(time))), 1, 8) AS total_today FROM ${ac} WHERE day = '${today}'`,function(error,results,fields){
            if (error == null){
              const sumtoday = results[0].total_today;
                           
              const query = "SELECT IF(TIMEDIFF((SELECT SEC_TO_TIME(SUM(TIME_TO_SEC(`time`))) FROM `" + ac + "` WHERE `day` = ?), (SELECT SEC_TO_TIME(SUM(TIME_TO_SEC(`time`))) FROM `" + ac + "` WHERE `day` = ?)) < 0, SUBSTRING(TIMEDIFF((SELECT SEC_TO_TIME(SUM(TIME_TO_SEC(`time`))) FROM `" + ac + "` WHERE `day` = ?), (SELECT SEC_TO_TIME(SUM(TIME_TO_SEC(`time`))) FROM `" + ac + "` WHERE `day` = ?)), 1, 9), SUBSTRING(TIMEDIFF((SELECT SEC_TO_TIME(SUM(TIME_TO_SEC(`time`))) FROM `" + ac + "` WHERE `day` = ?), (SELECT SEC_TO_TIME(SUM(TIME_TO_SEC(`time`))) FROM `" + ac + "` WHERE `day` = ?)), 1, 8)) AS `diff`";
              connection.query(query,[today,yesterday,today, yesterday,today,yesterday], function(error,results,fields){
                if (error == null){
                  const diff = results[0].diff;

                  //差分によってクラスを付与
                  const diffClass = (diff < '00:00:00') ? 'minus' : 'plus';

                  connection.query(`SELECT DAY(day) AS day_of_month, DATE_FORMAT(SEC_TO_TIME(SUM(TIME_TO_SEC(time))), '%H:%i:%s') AS total_time FROM ${ac} WHERE MONTH(day) = '${month2}' AND YEAR(day) = '${year}' GROUP BY day_of_month`,function(error,results,fields){
                    if(error == null){


                      const dayArray = results.map((row) => row.day_of_month );
                      const timeArray = results.map((row) => row.total_time );
                      
                      

                      const hourArray = timeArray.map((n) => {
                        const timeString = n + ":00:00";
                        const [hours, minutes, seconds] = timeString.split(":").map(Number);
                        const hourValue = hours + minutes / 60 + seconds / 3600;
                        const roundedHourValue = hourValue.toFixed(2);
                        return roundedHourValue;
                      });
                      

                      //空配列用意
                      const a = new Array(today).fill(0);
                       for (let i = 0; i < dayArray.length; i++) {
                        const index = dayArray[i] - 1;
                        a[index] = hourArray[i];
                      }
                      

                      res.render("index.ejs", {
                        content: element,
                        content_sum: sum,
                        content_sumtoday: sumtoday,
                        content_diff:diff,
                        content_diffClass:diffClass,
                        content_canvs:a,
                      });
                      connection.end();
                    }else{
                      console.log(error);
                      connection.end();
                    }
                  });
                }else{
                console.log(error);
                connection.end();
              }
            });
            }else{
              console.log(error);
              connection.end();
            }
          });
        }else{
          console.log(error);
          connection.end();
        }
      });
    }else{
      console.log(error);
      connection.end();
    }
  });
}
//Main code

app.get("/", (req, res) => {
  if (ac == undefined){
    res.redirect("/signin");
  }else{
    const connection = mysql.createConnection(mysql_setting);
    connection.connect();
    querynormal(connection,res)
  }
});

//login処理(sign in)
app.get("/signin",(req,res)=>{
  res.render("signin.ejs");
})

//sigin in (post)
app.post("/signin",(req,res)=>{
  const bodyac = req.body.acount;
  const bodypw = req.body.passward;
  
  const connection = mysql.createConnection(mysql_setting2);
  connection.connect();
  connection.query(`SELECT * FROM acount WHERE id = '${bodyac}' AND pw = '${bodypw}'`,function(error,results,fields){
    if(error){
      console.log(error);
      connection.end();
    }else{
      //一致している場合はデータが送られる,されていない場合はundefined
      const data = results[0]
      if(data !== undefined){
        console.log("成功")
        ac = bodyac;
        res.redirect("/");
        connection.end();
      }else{
        console.log("error")
        connection.end();
        res.redirect("/signin");
      }
    }
  })
});

//login処理(sigin up)
app.get("/signup",(req,res)=>{
  let error = ""
  res.render("signup.ejs",{
    content_error: error,
  });
})

//sigin up (post)
app.post("/signup",(req,res)=>{
  const bodyac = req.body.acount;
  const bodypw = req.body.passward;

  ac = bodyac;
  const pw = bodypw;

  const connection = mysql.createConnection(mysql_setting2);
  connection.connect();
  connection.query(`insert into acount (id,pw) value ('${ac}','${pw}')`,function(error,results,fields){
    if (error) {
      let content = "このアカウント名は既に存在しています"
      res.render("signup.ejs", {
        content_error: content,
      });
      console.log("エラー");
    } else {
      connection.end();
      const connection2 = mysql.createConnection(mysql_setting);
      connection2.connect();
      connection2.query(`CREATE TABLE ${ac} (no INT AUTO_INCREMENT PRIMARY KEY,day TEXT,time TEXT)`,function(error,results,fields){
        if(error){
          console.log(error)
        }else{
          console.log("アカウントデータを登録しました");
          connection2.end();
          res.redirect("/");
        }
      });
    }
  });
});

//post
app.post("/", (req, res) => {
  const bodytime = req.body.time;
  const bodyday = req.body.day;
  console.log(bodytime);
  if (bodytime !== "00:00:00") {
    const data = {
      time: bodytime,
      day:bodyday,
    };
    const connection = mysql.createConnection(mysql_setting);
    connection.connect();
    connection.query(
      `insert into ${ac} set ?`,
      data,
      function (error, results, fields) {
        if (error) {
          console.log(error);
        } else {
          querynormal(connection,res);
        }
      }
    );
  } else {
    console.log("00:00:00のためデータの登録を中止しました");
    res.redirect("/");
  }
});

//delete処理

app.post('/delete',(req,res)=>{
  const bodytime = req.body.data;
  console.log('ID:' + bodytime + 'を選択');
  const connection = mysql.createConnection(mysql_setting);
    connection.connect();
    connection.query('DELETE FROM `' + ac + '` WHERE `' + ac + '`.`no` = ' + bodytime,
    (error,results,fields)=>{
      if(error)throw error;
      console.log('Deleted row:', results.affectedRows);
      connection.end();
      res.redirect("/");
    });
})

//登録処理

app.post('/submit',(req,res)=>{
  const bodytime = req.body.time;
  const bodyno = req.body.no;
  
  const connection = mysql.createConnection(mysql_setting);
    connection.connect();
    connection.query('UPDATE `' + ac + '` SET `time` = ? WHERE `' + ac + '`.`no` = ?', [bodytime, bodyno],
    (error,results,fields)=>{
      if(error)throw error;
      console.log(bodyno + 'を' + bodytime + 'に修正');
      connection.end();
      res.redirect("/");
    });
});