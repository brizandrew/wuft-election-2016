var request = require('request');
var cheerio = require('cheerio');
var mysql = require('mysql');
var connectionObj = {
	host : '',
	user : '',
	password : '',
	database : ''
};
var requestHeaders = {
	url: '',
	headers: {
		'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5); Andrew Briz/WUFT/briz.andrew@gmail.com'
	}
};

var stateRaces = {
	'Representative in Congress, District 2': {
		counties: [
			'Bay',
			'Calhoun',
			'Columbia',
			'Dixie',
			'Franklin',
			'Gilchrist',
			'Gulf',
			'Holmes',
			'Jackson',
			'Jefferson',
			'Lafayette',
			'Leon',
			'Levy',
			'Liberty',
			'Marion',
			'Suwannee',
			'Taylor',
			'Wakulla',
			'Washington'
		],
		reporting: 0
	},
	'Representative in Congress, District 3': {
		counties: ['Alachua', 'Bradford', 'Clay', 'Marion', 'Putnam', 'Union'],
		reporting: 0
	},
	'Representative in Congress, District 11': {
		counties: ['Citrus', 'Hernando', 'Lake', 'Marion', 'Sumter'],
		reporting: 0
	},
	'State Senator, District 8': {
		counties: ['Alachua', 'Marion', 'Putnam'],
		reporting: 0
	},
	'State Representative, District 10': {
		counties: ['Alachua', 'Baker', 'Columbia', 'Hamilton', 'Suwannee'],
		reporting: 0
	},
	'State Representative, District 19': {
		counties: ['Bradford', 'Clay', 'Putnam', 'Union'],
		reporting: 0
	},
	'State Representative, District 21': {
		counties: ['Alachua', 'Dixie', 'Gilchrist'],
		reporting: 0
	},
	'State Representative, District 23': {
		counties: ['Marion'],
		reporting: 0
	},
	'State Representative, District 35': {
		counties: ['Hernando'],
		reporting: 0
	}
};

function scrapeCountyReportingStatus(){
	requestHeaders.url = 'http://enight.elections.myflorida.com/CountyReportingStatus/';
	request(requestHeaders, function(error, response, html){
			if(!error){
				var $ = cheerio.load(html);
				var totalCounties = 0;
				var countiesReporting = 0;
				$('.reportingTable tr').not('thead tr').not('tr:last-child').each(function(){
					totalCounties++;
					if($(this).find('td').eq(5).text() == 'Y'){
						countiesReporting++;
						var race;
						for(race in stateRaces){
							if( stateRaces[race].counties.indexOf($(this).find('td').eq(0).text().trim()) >= 0 )
								stateRaces[race].reporting++;
						}
					}
				});

				var fullStateRacesConn = mysql.createConnection(connectionObj);
				fullStateRacesConn.connect();
				fullStateRacesConn.query("UPDATE `election2016-races` SET segmentsReporting = ? WHERE segmentType = 'Counties' AND `election2016-races`.id > 49",[countiesReporting],function(err,result){
					if(err)
						console.warn('An error occured updating full state county races reporting status.');
				});
				fullStateRacesConn.end();

				// This was meant to scrape the counties reporting for multi-county races. It did not work on election night. I inputted those numbers manually.
				/*
				var race;
				for (race in stateRaces) {
					var segmentsReporting = stateRaces[race].reporting;
					var totalSegments = stateRaces[race].counties.length;
					var scrapeName = race;

					var otherStateRacesConn =  mysql.createConnection(connectionObj);
					otherStateRacesConn.connect();
					otherStateRacesConn.query("UPDATE `election2016-races` SET segmentsReporting = ?, totalSegments = ? WHERE scrapeName = ?",[segmentsReporting, totalSegments, scrapeName], function(err, result){
						if(err)
							console.warn('An error occured updating other state county races reporting status.');
					});
					otherStateRacesConn.end();
				}
				*/
			}
		});
}

function scrapeStateResult(url, raceNames){
	requestHeaders.url = url;
	request(requestHeaders, function(error, response, html){
		// start request callback
		if(!error){
			var $ = cheerio.load(html);

			// start races loop
			for (var i = raceNames.length - 1; i >= 0; i--) {
				var raceName = raceNames[i];
				var candidateConnection = mysql.createConnection(connectionObj);
				candidateConnection.connect();
				candidateConnection.query('SELECT `election2016-candidates`.name, `election2016-candidates`.id, `election2016-races`.scrapeName AS raceName FROM `election2016-candidates` JOIN `election2016-races` ON `election2016-candidates`.raceId = `election2016-races`.id WHERE `election2016-races`.scrapeName = ?;',[raceName],function(err,result){
					// start candidate Id callback
					if(!err){
						var candidates = result;
						// start candidates loop
						for (var i = candidates.length - 1; i >= 0; i--) {
							var raceDiv = $('div.grid-title:contains("'+ candidates[i].raceName +'")').first().next().next();
							var votes = raceDiv.find('td:contains("'+ candidates[i].name +'")').next().next().next().text();
							votes = parseFloat(votes);

							if(Number.isNaN(votes)){
								console.warn('No vote found for candidate "' + candidates[i].name + '" in race: ' + candidates[i].raceName);
								votes = 0;
							}

							var updateVotesConn = mysql.createConnection(connectionObj);
							updateVotesConn.connect();
							updateVotesConn.query("UPDATE `election2016-candidates` SET votesPercent = ? WHERE id = ?;",[votes,candidates[i].id]);
							updateVotesConn.end();
						} // end candidates loop
					}
					else{
						console.warn('An error occured while selecting from SQL DB for the following race: ' + raceName);
						console.warn(err);
					}
				});	// end candidate Id callback
				candidateConnection.end();
			} // end races loop
		}
		else{
			console.warn('An error occured while sending URL request for the following url: ' + url);
		}
	}); // end request callback
}

function scrapeCountyResult(url, enrIds){
	requestHeaders.url = url;
	request(requestHeaders, function(error, response, html){
		// start request callback
		if(!error){
			var $ = cheerio.load(html);

			// start races loop
			for (var i = enrIds.length - 1; i >= 0; i--) {
				var enrId = enrIds[i];

				// scrape race info
				var totalSegments = parseInt($('#numPrecinctsParticipating-' + enrId).first().text());
				var segmentsReporting = parseInt($('#numPrecinctsReported-' + enrId).first().text());
				var raceConnection = mysql.createConnection(connectionObj);
				raceConnection.connect();
				raceConnection.query("UPDATE `election2016-races` SET totalSegments = ?, segmentsReporting = ? WHERE enrId = ?;",[totalSegments,segmentsReporting,enrId]);
				raceConnection.end();

				// scrape candidate info
				var candidateConnection = mysql.createConnection(connectionObj);
				candidateConnection.connect();
				candidateConnection.query('SELECT `election2016-candidates`.name, `election2016-candidates`.id, `election2016-races`.enrId FROM `election2016-candidates` JOIN `election2016-races` ON `election2016-candidates`.raceId = `election2016-races`.id WHERE `election2016-races`.enrId = ?;',[enrId],function(err,result){
					if(!err){
						var candidates = result;
						// start candidates loop
						for (var i = candidates.length - 1; i >= 0; i--) {
							var votes = $('#'+candidates[i].enrId).find('div.ChoiceColumn:contains("'+ candidates[i].name +'")').next().next().text();
							votes = parseFloat(votes);

							if(Number.isNaN(votes)){
								console.warn('No vote found for candidate "' + candidates[i].name + '" in race enrId #' + candidates[i].enrId);
								votes = 0;
							}

							var updateVotesConn = mysql.createConnection(connectionObj);
							updateVotesConn.connect();
							updateVotesConn.query("UPDATE `election2016-candidates` SET votesPercent = ? WHERE id = ?;",[votes,candidates[i].id]);
							updateVotesConn.end();
						} // end candidates loop
					}
					else{
						Console.warn('An error occured while selecting from SQL DB for the following race: ' + raceName);
					}
				}); // end candidate Id callback
				candidateConnection.end();
			} // end races loop
		}
		else{
			Console.warn('An error occured while sending URL request for the following url: ' + url);
		}
	});
}

function scrape(){
	console.log(getNow().time)
	var scrapes = [];

	scrapes.push(function(){
		scrapeCountyReportingStatus();
		console.log('County Reporting Status Scraped.');
	});

	// Scrape U.S. Senators
	scrapes.push(function(){
		scrapeStateResult('http://enight.elections.myflorida.com/FederalOffices/Senator/',[
			'United States Senator'
		]);
		console.log('U.S. Senators Scraped.');
	});

	// Scrape U.S. Reps
	scrapes.push(function(){
		scrapeStateResult('http://enight.elections.myflorida.com/FederalOffices/Representative/',[
			'Representative in Congress, District 2',
			'Representative in Congress, District 3',
			'Representative in Congress, District 11'
		]);
		console.log('U.S. Representatives Scraped.');
	});

	// Scrape State Senators
	scrapes.push(function(){
		scrapeStateResult('http://enight.elections.myflorida.com/Offices/StateSenate/',[
			'State Senator, District 8'
		]);
		console.log('State Senators Scraped.');
	});

	// Scrape State Reps
	scrapes.push(function(){
		scrapeStateResult('http://enight.elections.myflorida.com/Offices/StateRepresentative/', [
			'State Representative, District 10', 
			'State Representative, District 19', 
			'State Representative, District 21', 
			'State Representative, District 23', 
			'State Representative, District 35'
		]);
		console.log('State Representatives Scraped.');
	});

	// Scrape Amendments
	scrapes.push(function(){
		scrapeStateResult('http://enight.elections.myflorida.com/Constitutional/Amendment.aspx', [
			'Rights of Electricity Consumers Regarding Solar Energy Choice', 
			'Use of Marijuana for Debilitating Medical Conditions', 
			'TAX EXEMPTION FOR TOTALLY AND PERMANENTLY DISABLED FIRST RESPONDERS', 
			'HOMESTEAD TAX EXEMPTION FOR CERTAIN SENIOR, LOW-INCOME, LONG-TERM RESIDENTS; DETERMINATION OF JUST VALUE'
		]);
		console.log('Amendments Scraped.');
	});

	// Scrape Alachua County
	scrapes.push(function(){
		scrapeCountyResult('http://enr.electionsfl.org/ALA/1654/Summary/', [
			'13363' //  Sheriff
		]);
		console.log('Alachua County Scraped.');
	});

	// Scrape Bradford County
	scrapes.push(function(){
		scrapeCountyResult('http://enr.electionsfl.org/BRA/1669/Summary/', [
			'13850', // Commission 3
			'13851', // Commission 5
			'13849', // Superintendent
			'13853', // School Board 2
			'13847', // Sheriff
			'13848' // Tax Collector
		]);
		console.log('Bradford County Scraped.');
	});

	// Scrape Citrus County
	scrapes.push(function(){
		scrapeCountyResult('http://enr.electionsfl.org/CIT/Summary/1625/', [
			'12160', // Commission 1
			'12161', // Commission 3
			'12162', // Commission 5
			'12170', // School Board 4
			'12159', // Sheriff
		]);
		console.log('Citrus County Scraped.');
	});

	// Scrape Columbia County
	scrapes.push(function(){
		scrapeCountyResult('http://enr.electionsfl.org/CLM/1522/Summary/', [
			'9845' // Commission 5
		]);
		console.log('Columbia County Scraped.');
	});

	// Scrape Dixie County
	scrapes.push(function(){
		scrapeCountyResult('http://enr.electionsfl.org/DIX/Summary/1629/', [
			'13339', // Commission 1
			'13340', // Commission 3
			'13341', // Commission 5
			'13338', // Superintendent
			'13337' // Sheriff
		]);
		console.log('Dixie County Scraped.');
	});

	// Scrape Gilchrist County
	scrapes.push(function(){
		scrapeCountyResult('http://enr.electionsfl.org/GIL/Summary/1678/', [
			'14179', // Commission 3
			'14178' // Tax Collector
		]);
		console.log('Gilchrist County Scraped.');
	});

	// Scrape Hernando County
	scrapes.push(function(){
		scrapeCountyResult('http://enr.electionsfl.org/HER/1623/Summary/', [
			'12569', // Commission 1
			'12570', // Commission 3
			'12571', // Commission 5
			'12567', // Property Appraiser
			'12579', // School Board 4
			'12568' // Supervisor of Elections
		]);
		console.log('Hernando County Scraped.');
	});

	// Scrape Lafayette County
	scrapes.push(function(){
		scrapeCountyResult('http://enr.electionsfl.org/LAF/1667/Summary/', [
			'13784' //  Tax Collector
		]);
		console.log('Lafayette County Scraped.');
	});

	// Scrape Marion County
	scrapes.push(function(){
		scrapeCountyResult('http://enr.electionsfl.org/MRN/Summary/1630/', [
			'12349', // Commission 1
			'12348' // Sheriff
		]);
		console.log('Marion County Scraped.');
	});

	// Scrape Putnam County
	scrapes.push(function(){
		scrapeCountyResult('http://enr.electionsfl.org/PUT/1646/Summary/', [
			'13420', // Commission 1
			'13421', // Commission 3
			'13422', // Commission 5
			'13419', // Superintendent
			'13418' // Sheriff
		]);
		console.log('Putnam County Scraped.');
	});

	// Scrape Suwannee County
	scrapes.push(function(){
		scrapeCountyResult('http://enr.electionsfl.org/SUW/Summary/1666/', [
			'13749', // Commission 1
			'13750', // Commission 5
			'13748', // Superintendent
			'13746' // Sheriff
		]);
		console.log('Suwannee County Scraped.');
	});

	// Scrape Union County
	scrapes.push(function(){
		scrapeCountyResult('http://enr.electionsfl.org/UNI/Summary/1668/', [
			'13826', // Clerk of Court
			'13827', // Commission 3
			'13828' // Commission 4
		]);
		console.log('Union County Scraped.');
	});

	// Send requests 3 seconds apart
	for (var i = 0; i < scrapes.length; i++) {
		var timeout = 3000 * ( i );
		var callback = scrapes[i];
		setTimeout(callback,timeout);
	}
}

function getCountiesInRaces(){
	requestHeaders.url = 'http://enight.elections.myflorida.com/CompareByCounty/?ContestId=140020';
	request(requestHeaders, function(error, response, html){
			if(!error){
				var $ = cheerio.load(html);
				$('select[name="ctl00$MainContent$CompareByCounty1$CountyList"] option').each(function(){
					stateRaces['Representative in Congress, District 2'].counties.push($(this).text().trim());
				});
			}
	});

	requestHeaders.url = 'http://enight.elections.myflorida.com/CompareByCounty/?ContestId=140030';
	request(requestHeaders, function(error, response, html){
			if(!error){
				var $ = cheerio.load(html);
				$('select[name="ctl00$MainContent$CompareByCounty1$CountyList"] option').each(function(){
					stateRaces['Representative in Congress, District 3'].counties.push($(this).text().trim());
				});
			}
	});

	requestHeaders.url = 'http://enight.elections.myflorida.com/CompareByCounty/?ContestId=140110';
	request(requestHeaders, function(error, response, html){
			if(!error){
				var $ = cheerio.load(html);
				$('select[name="ctl00$MainContent$CompareByCounty1$CountyList"] option').each(function(){
					stateRaces['Representative in Congress, District 11'].counties.push($(this).text().trim());
				});
			}
	});

	requestHeaders.url = 'http://enight.elections.myflorida.com/CompareByCounty/?ContestId=240080';
	request(requestHeaders, function(error, response, html){
			if(!error){
				var $ = cheerio.load(html);
				$('select[name="ctl00$MainContent$CompareByCounty1$CountyList"] option').each(function(){
					stateRaces['State Senator, District 8'].counties.push($(this).text().trim());
				});
			}
	});

	requestHeaders.url = 'http://enight.elections.myflorida.com/CompareByCounty/?ContestId=260100';
	request(requestHeaders, function(error, response, html){
			if(!error){
				var $ = cheerio.load(html);
				$('select[name="ctl00$MainContent$CompareByCounty1$CountyList"] option').each(function(){
					stateRaces['State Representative, District 10'].counties.push($(this).text().trim());
				});
			}
	});

	requestHeaders.url = 'http://enight.elections.myflorida.com/CompareByCounty/?ContestId=260190';
	request(requestHeaders, function(error, response, html){
			if(!error){
				var $ = cheerio.load(html);
				$('select[name="ctl00$MainContent$CompareByCounty1$CountyList"] option').each(function(){
					stateRaces['State Representative, District 19'].counties.push($(this).text().trim());
				});
			}
	});

	requestHeaders.url = 'http://enight.elections.myflorida.com/CompareByCounty/?ContestId=260210';
	request(requestHeaders, function(error, response, html){
			if(!error){
				var $ = cheerio.load(html);
				$('select[name="ctl00$MainContent$CompareByCounty1$CountyList"] option').each(function(){
					stateRaces['State Representative, District 21'].counties.push($(this).text().trim());
				});
			}
	});

	requestHeaders.url = 'http://enight.elections.myflorida.com/CompareByCounty/?ContestId=260230';
	request(requestHeaders, function(error, response, html){
			if(!error){
				var $ = cheerio.load(html);
				$('select[name="ctl00$MainContent$CompareByCounty1$CountyList"] option').each(function(){
					stateRaces['State Representative, District 23'].counties.push($(this).text().trim());
				});
			}
	});

	requestHeaders.url = 'http://enight.elections.myflorida.com/CompareByCounty/?ContestId=260350';
	request(requestHeaders, function(error, response, html){
			if(!error){
				var $ = cheerio.load(html);
				$('select[name="ctl00$MainContent$CompareByCounty1$CountyList"] option').each(function(){
					stateRaces['State Representative, District 35'].counties.push($(this).text().trim());
				});
			}
	});
}

function getNow(){
		var date = new Date();
		
		var month = date.getMonth() + 1;
		var day = date.getDate();
		var year = date.getFullYear() + '';
		year = year.substring(2,4);
		var dateStr = month + '/' + day + '/' + year;

		var hour = date.getHours();
		var ampm;
		if(hour < 12){
			ampm = 'am';
		} 
		else{
			hour = hour - 12;
			ampm = 'pm';
		}
		if(hour === 0){
			hour = 12;
		}
		var minutes = date.getMinutes() + '';
		if(minutes.length < 2)
			minutes = '0' + minutes;
		var timeStr = hour + ':' + minutes + ampm;

		return {
			date: dateStr,
			time: timeStr
		};
	}

scrape();
setInterval(function(){
	scrape();
},60000)





