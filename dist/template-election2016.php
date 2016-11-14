<?php
/*
Template Name: WUFT Election 2016
*/
?>

<?php get_header(); ?>

<link rel="stylesheet" type="text/css" href="<?php echo get_stylesheet_directory_uri(); ?>/election2016-style.css">
<meta name="election-directory" href="<?php echo get_stylesheet_directory_uri(); ?>"/>
<div class="entry" id="election-results">
	<h1 id="election-headline"><?php the_title(); ?></h1>
	<div id="election-foreword"><?php the_content(); ?></div>
	<div id="election-results-filter-dropdown">
		<select>
			<option value="" disabled selected>Filter By County</option>
			<option value="All">All</option>
			<option value="Alachua">Alachua</option>
			<option value="Bradford">Bradford</option>
			<option value="Citrus">Citrus</option>
			<option value="Columbia">Columbia</option>
			<option value="Dixie">Dixie</option>
			<option value="Gilchrist">Gilchrist</option>
			<option value="Hernando">Hernando</option>
			<option value="Lafayette">Lafayette</option>
			<option value="Levy">Levy</option>Levy
			<option value="Marion">Marion</option>
			<option value="Putnam">Putnam</option>
			<option value="Suwannee">Suwannee</option>
			<option value="Union">Union</option>
		</select>
	</div>
	<div id="live-results" style="width:0px"></div>
	<p id="lastUpdated"></p>
	<div id="loadScreen" toggle="on">
		<img src="<?php echo get_stylesheet_directory_uri(); ?>/election2016-img/loading.gif">
	</div>
	<div id="election-results-sidePanel">
		<h4>Filter By County</h4>
		<ul>
			<li value="All" class="selected">All</li>
			<li value="Alachua">Alachua</li>
			<li value="Bradford">Bradford</li>
			<li value="Citrus">Citrus</li>
			<li value="Columbia">Columbia</li>
			<li value="Dixie">Dixie</li>
			<li value="Gilchrist">Gilchrist</li>
			<li value="Hernando">Hernando</li>
			<li value="Lafayette">Lafayette</li>
			<li value="Levy">Levy</li>
			<li value="Marion">Marion</li>
			<li value="Putnam">Putnam</li>
			<li value="Suwannee">Suwannee</li>
			<li value="Union">Union</li>
		</ul>
	</div>
	<div id="candidateModal" class="modalContainer" style="display:none">
		<div class="modalContent">
			<div class="candidateModal-imgContainer">
				<img id="candidateModal-img"/>
			</div>
			<div class="modal-close">X</div>
			<h3 id="candidateModal-name"></h3>
			
			<h4 id="candidateModal-partyContainer">
				Party: 
				<span class="candidateModal-value" id="candidateModal-party"></span>
			</h4>
			<h4>
				Votes: 
				<span class="candidateModal-value"id="candidateModal-votes"></span>
			</h4>
		</div>
	</div>
	<div id="election-results-sections"></div>
</div>
<script src="<?php echo get_stylesheet_directory_uri(); ?>/election2016-main.min.js"></script>

<?php get_footer(); ?>