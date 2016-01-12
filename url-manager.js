"use strict";
var fs = require('fs');
var readline = require('readline');
var Log = require('log');
class UrlManager{
		constructor(){
				this.uncheck = new Set();
				this.newUrl = new Set();
				this.crawling = new Set();
				this.crawled = new Set();
				this.failed = new Set();
				this.config = require("./config.json");
				this.seenLog = new Log('debug',
									   fs.createWriteStream('seen.log',{flags: 'a'}) );
				this.failLog = new Log('debug',
									   fs.createWriteStream('fail.log',{flags: 'a'}) );
				/*use:
				 * this.config.minNewUrlSize
				 * this.config.maxUncheckSize
				 */
		}
		setDiff(){
				for(let url of this.uncheck.values()){
						if(this.crawled.has(url) || this.crawling.has(url) ){
						}else{
								this.newUrl.add(url);
						}
						this.uncheck.delete(url);
				}
				return this.newUrl.size;
		}
		seed(filename){
				var readStream = fs.createReadStream(filename);
				readStream.on('open',  () => {
						let rl = readline.createInterface({
								input: readStream
						});
						rl.on('line', (line)=>{
								this.add(line);
						});
						rl.on('close',()=>{
								this.setDiff();
						});
				});


		}
		add(urls){
				if(typeof urls === "string"){
						urls = [urls];
				}else if(Array.isArray(urls)){
				}
				for(let url of urls){
						this.uncheck.add(url);
				}
				if(this.uncheck.size > this.config.maxUncheckSize){
						this.setDiff();
				}
		}
		resultParse(obj){
				/*
				 * obj should:
				 * {
				 *   error: <string: ETIMEDOUT|CRASHED> (optional),
				 *   request: <string: crawled page url>
				 *   status: <Interger: request's response's status code>
				 *   urls:
				 *       [
				 *           {url: <string: crawled page's url>,text: <string: anchorText>}
				 *               ...
				 *       ]
				 * }
				 * */
				if(obj.error){
						this.fail(obj.request, error);
						return;
				}
				this.seen(obj.request);
				for(let urlObj of obj.urls){
						this.add(urlObj.url);
				}
		}
		seen(urls){
				if(typeof urls === "string"){
						urls = [urls];
				}else if(Array.isArray(urls)){
				}else{
						console.error("something error");
				}
				for(let url of urls){
						this.crawled.add(url);
						this.crawling.delete(url);
						this.seenLog.info(url);
				}
		}
		fail(url,reason){
				reason =reason || "unknown";
				if(typeof urls === "string"){
				}else{
						console.error("something error");
				}
				this.failed.add(url);
				this.crawling.delete(url);
				this.failLog.info(`[${reason}]\t${url}`);
		}
		pop(num){
				num = num || 1;
				if(this.newUrl.size <= this.config.minNewUrlSize
						|| this.newUrl.size <num
				  ){
						  this.setDiff();
				  }
				  var urls = [];
				  var iterator = this.newUrl.values();
				  for (let i =0,url; i < num ; i++){						
						  url = iterator.next().value;
						  if(!url)continue;
						  this.crawling.add(url);
						  urls.push(url);
						  this.newUrl.delete(url);
				  }
				  return urls;
		}
		save(){
		}
		check(){
				console.log(
						new Date(),
						"unckeck: "+this.uncheck.size,
						"new: "+this.newUrl.size,
						"crawling: " + this.crawling.size,
						"crawled" + this.crawled.size
				)
		}

}

module.exports = UrlManager;
