"use strict";
var cluster = require('cluster');
var os = require('os');
var readline = require('readline');
var EventEmitter = require('events');

var request = require('request');

var debug = {
		log: function(...args){
				console.log(...args);
		}
};

class Controler extends EventEmitter{
		constructor(){
				super();
				this.config = require("./config.json");
				this.maxConcurrent = this.config.maxConcurrent;

				this.cluster();
				this._init();

				this.getWorkerGenerator = this.workerGenerator();
				this.urlQueue = [];

				this.run = false;
				this.parsing = 0;
				this.lastDrain = 0;


		}
		_init(){
				this.on('drain', () => {
						let date = new Date();
						if( (date - this.lastDrain ) < 1000 ){
								setTimeout(()=>{this.emit('drain')}, 1000);
								return;
						}

						this.lastDrain = date;
						this.getUrls(this.config.urlResource)
						.then(() => {
								this.emit('release');
						})
						.catch((e)=>{
								console.log(e);
						});
				})
				this.on('release', () => {
						if( !this.run ){
								return;
						}
						if(this.urlQueue.length == 0){
								this.emit('drain');
								return;
						}
						let crawlNum = this.maxConcurrent - this.parsing;
						if( crawlNum > 0   ){
								this.fetchUrls(crawlNum);
						}
				});
		}
		stop(){
				this.run = false;
		}
		start(){
				this.run = true;
				if(this.urlQueue.length == 0){
						this.emit('drain');
				}else{
						this.emit('release');
				}
		}
		cluster(workerNum){
				this.workerNum = workerNum ||os.cpus().length;
				//this.workerNum=2;//testing
				for (let i = 0; i < this.workerNum; i += 1){
						cluster.fork();
				}
				cluster.on('online', function(worker) {
						debug.log('Worker ' + worker.process.pid + ' is online');
				});
				cluster.on('message', (message) => {
						this.parseEndHandler(message);
				});

				cluster.on('exit', function(worker, code, signal) {
						debug.log('Worker[' + worker.process.pid
								  +']died with [' + code + ']signal: ' + signal);
								  cluster.fork();
				});
		}
		parseEndHandler(status){
				/*
				 * assum status = {
				 *  error : <string: ETIMEDOUT|CRASHED> (optional),
				 *  status: <Interger: http-status-code(200,403,404,500,...)>,
				 * 	request: <origin_url>, 
				 * 	urls:
				 * 		[
				 * 		{ url: <string: crawled page's url>,text: <string: anchorText>}
				 * 			...
				 * 		] 
				 * }
				 *
				 * */
				this.parsing--;
				this.emit('release');
				if(typeof status === "string"){
				}else{
						status = JSON.stringify(status);
				}
				this.putStatus(status);
		}
		getWorker(){
				let worker = this.getWorkerGenerator.next();
				return worker.value;
		}
		*workerGenerator(){
				while(true){
						for (let id in cluster.workers) {
								let worker = cluster.workers[id];
								if(worker){
										yield worker;
								}else {
										continue;
								}
						}
				}
		}
		putStatus(msg){
				request({
						uri: this.config.urlReport ,
						method: "POST",
						body: msg
				},function(err,res,body){
						if(err){
								console.error("@putStatus.request()",err);
								return;
						}
						console.log("putStatus body:",body);
				});

		}
		getUrls (url){
				return new Promise((resolve, reject) => {
						var rl = readline.createInterface({
								input:request(url)
						});
						rl.on('line',  (data) => {
								if(data == ""){
										return;
								}
								/*
								var obj;
								try{
										obj = JSON.parse(data);
								}catch(e){
										console.log(e);
										reject(e);
										return;
								}
								this.urlQueue.push(obj.url);
								*/
								this.urlQueue.push(data);

						});
						rl.on("close", function(){
								resolve();
						});
				}).catch(function(e){console.error(e);});
		}
		fetchUrls(num ){
				num = num || 1;
				for(let i=0,url;i<num;i++){
						url = this.urlQueue.pop();
						if(!url){
								continue;
						}
						this.fetchUrl(url);
				}
		}
		fetchUrl(url){
				request(url, (error, response, body)=>{
						if(error){
								console.log(error);
								return;
						}
						if ( response.statusCode == 200) {
								this.parse(response);
						}else{
								//TODO do something by statusCode
								console.log(response.statusCode);
						}

				});
		}
		parse(response){
				let worker = this.getWorker();
				worker.send(response);
				this.parsing++;
		}

}


module.exports = Controler;
