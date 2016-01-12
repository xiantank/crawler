"use strict";
var cheerio = require('cheerio');
var cluster = require('cluster');

if (cluster.isMaster) {
		var Controler = require('./controler.js');
		var controler = new Controler();

		var config = require('./config.json');
		const port = config.clientPort || 3986;
		var masterServer = config.masterServer || "http://localhost:5182";
		var express = require('express');

		var checkURL = function(url){
				//TODO : check url is real url or not; return Boolean
				return true;
		}




		var app = express();
		app.get('/', function(req,res){
				//controler.getUrls(masterServer+"/fetch/");
				console.log(new Date());
				res.write(new Date()+"");
				res.end();
		});
		app.get('/start', function(req,res){
				controler.start();
				res.write(new Date()+"controler.start()");
				res.end();
		});

		app.listen(port, function(){
				console.log("client-server run at port: ", port);
		});
		return;
}

//here is worker
var fs = require('fs');
var Log = require('log');
var errLog = new Log("err.log",fs.createWriteStream('error.log',{flags: 'a'}) );
process._debugPort = 5858 + cluster.worker.id
var Url = require("url");
var handler = function(response,base, source){
		var $ = cheerio.load(source);
		var links = $("a");
		var results = {};
		results.urls = [];
		results.status = response.statusCode;
		results.request = base;

		for(let i=0,len=links.length,record;i<len;i++){
				//console.log(Url.resolve(base, $(links[i]).attr("href") ));
				let relative = $(links[i]);
				
				try{
						relative = relative.attr("href");
						record = {
								url: Url.resolve(base, relative),
								text: $(links[i]).text()
						};
						results.urls.push(record);
				}catch(e){
						errLog.error(base, relative);
						continue;
				}
		}
		//console.log(base);
		process.send(results);
		console.log(JSON.stringify(results,null,2));

};

process.on('message', function(response){
		console.log(process.pid);
		handler(response, response.request.uri.href, response.body);
});
