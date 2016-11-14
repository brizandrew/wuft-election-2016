var election2016 = {
	d3: require('d3'),
	county: null,
	results: null,
	races: {},
	ele: null,
	refreshIntervalTime: 3000000,

	init: function(){
		var self = this;
		
		this.ele = document.getElementById('election-results');
		this.loadScreen = document.getElementById('loadScreen');
		this.lastUpdatedText = document.getElementById('lastUpdated');
		this.sections = document.getElementById('election-results-sections');

		this.dir = document.querySelector('meta[name="election-directory"]').getAttribute('href');

		// County Filters
		var filterSelect = document.getElementById('election-results-filter-dropdown').querySelector('select');
		filterSelect.addEventListener('change',function(){
			self.filter(this.value);
		});
		var handleFilterClick = function(){
			self.filter(this.getAttribute('value'));
		};
		var sidePanelCounties = document.getElementById('election-results-sidePanel').querySelectorAll('li');
		for (var i = sidePanelCounties.length - 1; i >= 0; i--) {
			sidePanelCounties[i].addEventListener('click',handleFilterClick);
		}

		// Refresh
		this.refreshInterval = setInterval(function(){
			self.update();
		},self.refreshIntervalTime);

		// Resize Video
		// this.pbsVideo = document.getElementById('PBSNewsHour');
		// this.pbsVideo.setAttribute('aspectRatio', this.pbsVideo.width/this.pbsVideo.height);
		// this.resizeVideo();
		// window.addEventListener('resize',function(){
		// 	self.resizeVideo();
		// });

		// Initialize Modal
		this.candidateModal = document.getElementById('candidateModal');
		this.candidateModal.querySelector('.modal-close').addEventListener('click',function(){
			self.candidateModal.style.display = 'none';
		});

		// Initial Build
		this.update();
	},

	update: function(){
		this.toggleLoadScreen(true);
		this.sections.innerHTML = '';
		this.pullResults();
	},

	toggleLoadScreen: function(on){
		if(on){
			this.scrollTopLocation = this.scrollTop();
			this.sections.style.marginTop = 'none';
			this.loadScreen.setAttribute('toggle','on');
		}
		else{
			this.sections.style.display = '';
			this.resizeHandler();
			this.loadScreen.setAttribute('toggle','off');
			this.scrollTop(this.scrollTopLocation);
		}
	},

	toggleModal: function(name, img, party, votes, hasIcon){
		var nameEle = this.candidateModal.querySelector('#candidateModal-name');
		var imgContainer = this.candidateModal.querySelector('.candidateModal-imgContainer');
		var imgEle = this.candidateModal.querySelector('#candidateModal-img');
		var partyEle = this.candidateModal.querySelector('#candidateModal-party');
		var partyContainerEle = this.candidateModal.querySelector('#candidateModal-partyContainer');
		var votesEle = this.candidateModal.querySelector('#candidateModal-votes');

		if(hasIcon == "true"){
			imgContainer.style.display = 'block';
			imgEle.src = img;
		}
		else if(hasIcon == "false"){
			imgContainer.style.display = 'none';
		}

		if(party !== null){
			partyContainerEle.style.display = 'block';
			partyEle.innerHTML = party;
		}
		else{
			partyContainerEle.style.display = 'none';
		}

		nameEle.innerHTML = name;
		votesEle.innerHTML = votes;
		this.candidateModal.style.display = 'flex';
	},

	filter: function(county){
		document.querySelector('#election-results-filter-dropdown [value="' + county + '"]').selected = true;

		var clickFilters = document.querySelectorAll('#election-results-sidePanel li');
		for (var i = clickFilters.length - 1; i >= 0; i--) {
			if(clickFilters[i].getAttribute('value') == county)
				clickFilters[i].className = 'selected';
			else
				clickFilters[i].className = '';
		}

		if(county !== null)
			this.county = county;
		else
			this.county = null;
		this.update();
	},

	pullResults: function(){
		var self = this;
		var url = self.dir + '/election2016-results.php';
		if(this.county !== null){
			url += "?county=" + this.county;
		}

		var xmlhttp = new XMLHttpRequest();
		xmlhttp.onreadystatechange = function() {
			if (xmlhttp.readyState == XMLHttpRequest.DONE ) {
				if (xmlhttp.status == 200) {
					self.results = JSON.parse(xmlhttp.responseText);
					self.build();
				}
				else if (xmlhttp.status == 400) {
					throw new Error('results.php: GET request returned error 400.');
				}
				else {
					throw new Error('results.php: GET request returned error.');
				}
			}
		};
		xmlhttp.open("GET", url, true);
		xmlhttp.send();
	},

	sortObjKeys: function(obj, property){
		var keys = Object.keys(obj);
		var sortedKeys = [keys[0]];

		for (var i = 1; i < keys.length; i++) {
			sortedKeysLoop:
			for (var j = 0; j < sortedKeys.length; j++) {
				if(obj[keys[i]][property] > obj[sortedKeys[j]][property]){
					sortedKeys.splice(j, 0, keys[i]);
					break sortedKeysLoop; 
				}
				if(j == sortedKeys.length - 1){
					sortedKeys.push(keys[i]);
					break sortedKeysLoop;
				}
			}
		}

		return sortedKeys;
	},

	build: function(){
		var self = this;

		// functions for retrieving d3 data
		var getVotesPercent = function(d, key){ return d[key].votesPercent; };
		var getIconURL      = function(d, key){ return self.dir + '/election2016-img/candidates/' + candidates[d.key].iconURL; };
		var getColor        = function(d, key){ return candidates[d.key].color; };
		var getParty		= function(d, key){ return candidates[d.key].party; };
		var getHasIcon		= function(d, key){ return candidates[d.key].hasIcon; };
		var getVotes		= function(d, key){ return candidates[d.key].votesPercent + '%'; };
		var getName         = function(d, key){      
									if(candidates[d.key].party !== null)
										return d.key + ' (' + candidates[d.key].party + ') – ' + candidates[d.key].votesPercent + '%';
									else
										return d.key + ' – ' + candidates[d.key].votesPercent + '%'; 
							};
		var getBarWidth     = function(d){
									var canvasWidth = parseFloat(this.parentElement.parentElement.getAttribute('canvasWidth'));
									return ( ( d[0][1] - d[0][0] ) * canvasWidth ) + '%'; 
							};
		var getBarX         = function(d){
									var canvasWidth = parseFloat(this.parentElement.parentElement.getAttribute('canvasWidth'));
									return ( d[0][0] * canvasWidth ) + '%'; 
							};
		var getCircX        = function(d){      
									var canvasWidth = parseFloat(this.parentElement.parentElement.getAttribute('canvasWidth'));
									return ( ( d[0][0] * canvasWidth ) + ( ( d[0][1] - d[0][0] ) * canvasWidth / 2 ) ) + '%'; 
							};
		var getImgX         = function(d){
									var canvasWidth = parseFloat(this.parentElement.parentElement.getAttribute('canvasWidth'));
									var svgWidth = this.parentElement.parentElement.clientWidth || this.parentElement.parentElement.parentNode.clientWidth ;
									var imgWidth = this.width.baseVal.value;
									var percentX = ( ( d[0][0] * canvasWidth ) + ( ( d[0][1] - d[0][0] ) * canvasWidth / 2 ) ) / 100;

									// Centered above its bar = half the size of the bar - half of its own size
									return ( ( percentX  * svgWidth ) - (imgWidth / 2) ) + 'px';
							};
		var imgClickHandler	= function(d, key){
									var name = d.key;
									var img = this.getAttribute('href');
									var party = this.getAttribute('party');
									var votes = this.getAttribute('votes');
									var hasIcon = this.getAttribute('hasIcon');
									self.toggleModal(name,img,party,votes,hasIcon);
							};

		// for each section (county)
		for (var section in this.results ) {
			var sectionEle = document.createElement('div');
			sectionEle.className = 'section';
			sectionEle.id = section;
			this.sections.appendChild(sectionEle);

			var sectionHeading = document.createElement('h3');
			sectionHeading.className = 'section-heading';
			sectionHeading.innerHTML = section;
			sectionEle.appendChild(sectionHeading);

			var sectionRaces = document.createElement('div');
			sectionRaces.className = 'section-races';
			sectionEle.appendChild(sectionRaces);
			
			// for each race
			for (var i = 0; i < this.results[section].length; i++) {
				var race = this.results[section][i];

				var raceEle = document.createElement('div');
				raceEle.className = 'race';
				sectionRaces.appendChild(raceEle);

				var raceHeader = document.createElement('div');
				raceHeader.className = 'race-header';
				raceEle.appendChild(raceHeader);

				if(race.called){
					var raceCalled = document.createElement('div');
					raceCalled.className = 'race-called';
					raceCalled.title = 'Race Called';
					raceCalled.style.backgroundImage = 'url("' + self.dir + '/election2016-img/checkmark.png")';
					raceHeader.appendChild(raceCalled);
				}

				var raceHeading = document.createElement('h4');
				raceHeading.className = 'race-heading';
				raceHeading.innerHTML = race.name;
				raceHeader.appendChild(raceHeading);

				var precincts = document.createElement('p');
				precincts.className = 'race-precincts';
				precincts.innerHTML = race.segmentsReporting + ' / ' + race.totalSegments + ' ' + race.segmentType + ' Reporting';
				raceHeader.appendChild(precincts);

				var canvasWidth = race.segmentsReporting / race.totalSegments;
				canvasWidth = Number.isNaN(canvasWidth) ? 1 : canvasWidth;
				
				var canvas = this.d3.select(raceEle).append('svg')
					.attr('width', '100%')
					.attr('height','80px')
					.attr('canvasWidth', canvasWidth);

				var candidates = race.candidates;
				var candidatesKeys = this.sortObjKeys(candidates, 'votesPercent');
				var series = this.d3.stack()
								.keys(candidatesKeys)
								.value(getVotesPercent)([candidates]);

				var gs = canvas.selectAll('g')
					.data(series)
					.enter()
					.append('g')
						.attr('name', getName);

				gs.append('svg:title')
					.text(getName);

				gs.append('rect')
					.attr('fill', getColor)
					.attr('height', '20px')
					.attr('width', getBarWidth)
					.attr('x', getBarX)
					.attr('y', '60px');

				gs.append('circle')
					.attr('fill', getColor)
					.attr('r','25')
					.attr('cy','25')
					.attr('cx', getCircX);


				gs.append('image')
					.attr('xlink:href', getIconURL)
					.attr('height', '50px')
					.attr('width', '50px')
					.attr('x', getImgX)
					.attr('party', getParty)
					.attr('votes', getVotes)
					.attr('hasIcon', getHasIcon)
					.on('click', imgClickHandler);

				var backgroundBar = document.createElement('div');
				backgroundBar.className = 'race-backgroundBar';
				backgroundBar.style.backgroundImage = 'url("' + self.dir + '/election2016-img/stripe-pattern.png")' ;
				raceEle.appendChild(backgroundBar);

			} // end race loop
		} // end section loop

		this.resizeHandler = function(){
			self.d3.selectAll('image').attr('x',getImgX);
			self.d3.selectAll('circle').attr('cx',getCircX);
			self.correctIcons();
		};

		window.addEventListener('resize', self.resizeHandler);

		this.correctIcons();
		this.toggleLoadScreen(false);
		var now = this.getNow();
		this.lastUpdatedText.innerHTML = 'Last updated at ' + now.time + ' on ' + now.date;
	},

	correctIcons: function(){
		var raceSVGs = document.getElementsByTagName('svg');
		for (var i = 0; i < raceSVGs.length; i++){
			var race = raceSVGs[i];
			var svgWidth = race.clientWidth || race.parentNode.clientWidth;

			var raceImgs = race.querySelectorAll('image');
			var raceCircles = race.querySelectorAll('circle');

			// If it's past the left margin, bring it in
			for (var j = raceImgs.length - 1; j >= 0; j--) {
				if(raceImgs[j].x.baseVal.value < 0){
					raceImgs[j].setAttribute('x', svgWidth - 50);
					raceCircles[j].setAttribute('cx', svgWidth - 25);
				}
			}

			// If it's past the right margin, bring it in
			for (j = raceImgs.length - 1; j >= 0; j--) {
				if(raceImgs[j].x.baseVal.value + 50 > svgWidth){
					raceImgs[j].setAttribute('x', svgWidth - 50);
					raceCircles[j].setAttribute('cx', svgWidth - 25);
				}
			}

			// If it's on top of or to the right of anything before it, move it to the right of it
			for (j = raceImgs.length - 1; j >= 0; j--) {
				if(j < raceImgs.length - 1 && raceImgs[j].x.baseVal.value + 50 >= raceImgs[j+1].x.baseVal.value){
					var prevX = raceImgs[j+1].x.baseVal.value;
					raceImgs[j].setAttribute('x', prevX - 55);
					raceCircles[j].setAttribute('cx', prevX - 30);
				}
			}

			// If it's past the left margin after that correction, bring it in
			for (j = raceImgs.length - 1; j >= 0; j--) {
				if(raceImgs[j].x.baseVal.value < 0){
					raceImgs[j].setAttribute('x', 0);
					raceCircles[j].setAttribute('cx', 25);
				}
			}

			// there's still some overlap, moves things to the right
			for (j = 0; j < raceImgs.length; j++) {
				if(j > 0 && raceImgs[j].x.baseVal.value <= raceImgs[j-1].x.baseVal.value + 55 ){
					var nexX = raceImgs[j-1].x.baseVal.value;
					raceImgs[j].setAttribute('x', nexX + 55);
					raceCircles[j].setAttribute('cx', nexX + 80);
				}
			}			
		}
	},

	getNow: function(){
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
		
	},

	scrollTop: function(scrollTop){
		// set scroll top
		if(scrollTop !== undefined){
			document.body.scrollTop = scrollTop;
			document.documentElement.scrollTop = scrollTop;
		}

		// get scroll top
		if(typeof pageYOffset == 'undefined'){
			//most browsers except IE before #9
			var B= document.body; //IE 'quirks'
			var D= document.documentElement; //IE with doctype
			D= (D.clientHeight)? D: B;
			return D.scrollTop;
		}
		else{
			return pageYOffset;
		}
	},

	resizeVideo: function(){
		var self = this;
		
		var padding;
		try {
			padding = window.getComputedStyle(self.pbsVideo.parentElement, null).getPropertyValue('padding-right');
		} catch(e) {
			padding = self.pbsVideo.parentElement.currentStyle.paddingRight;
		}

		padding = parseInt(padding.substring(0,padding.indexOf('px')));
		var width = this.pbsVideo.parentElement.clientWidth - (padding * 2);
		var aspectRatio = this.pbsVideo.getAttribute('aspectRatio');
		this.pbsVideo.width = width;
		this.pbsVideo.height = width / aspectRatio;
	}
};
election2016.init();