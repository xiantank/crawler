"use strict";
var express = require('express');
var config = require("./config.json");

var UrlManager = require('./url-manager.js');
var urlPool = new UrlManager();

var port = config.masterPort || 3912;

var app = express();

setInterval(function(){
		urlPool.check();
}, 3000 );

urlPool.seed("./test.txt");
//urlPool.seed("./site1.txt");
app.get("/fetch/", function(req, res){
		let newUrls = urlPool.pop(10);
		for(let url of newUrls){
				res.write(url+"\n");
		}
		res.end();

});
app.post("/crawledStatus/", function(req, res){
		console.log("/crawledStatus/",new Date());
		var data="";
		req.on("data", function(chunk){
				data += chunk
		});
		req.on("end", function(){
				let obj;
				/*
				* obj should: 
				* {
				* 	error: <string: ETIMEDOUT|CRASHED> (optional),
				* 	request: <string: crawled page url>
				* 	status: <Interger: request's response's status code>
				* 	urls:
				* 		[
				* 			{ url: <string: crawled page's url>,text: <string: anchorText>}
				* 				...
				* 		]
				* }
				* */
				try{
						obj = JSON.parse(data);
				}catch(e){
						//TODO log what error
						console.error("/crawledStatus/ jsonparse error",e);
				}
				urlPool.resultParse(obj);
				res.end();


		});
} );

app.listen(port, function(){
		console.log("Server run at port: ", port);
});
