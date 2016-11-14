<?php

$server   = "";
$database = "";
$username = "";
$password = "";

$conn = mysqli_connect($server, $username, $password, $database);

if (!$conn) {
    echo "Error: Unable to connect to database. ";
    echo "Debugging errno: " . mysqli_connect_errno();
    echo "Debugging error: " . mysqli_connect_error();
    exit;
}
else{
	$query = "SELECT `election2016-candidates`.id,  `election2016-candidates`.name, `election2016-candidates`.party, `election2016-candidates`.color, `election2016-candidates`.iconURL, `election2016-candidates`.hasIcon, `election2016-candidates`.votesPercent, `election2016-races`.id AS 'raceId', `election2016-races`.name AS 'raceName', `election2016-races`.called AS 'raceCalled', `election2016-races`.section AS 'raceSection', `election2016-races`.countyId AS 'raceCounties', `election2016-races`.enrId, `election2016-races`.segmentType, `election2016-races`.totalSegments, `election2016-races`.segmentsReporting  FROM `election2016-candidates` JOIN `election2016-races` ON `election2016-candidates`.raceId = `election2016-races`.id WHERE `election2016-races`.removed = 0";

	if($_GET["county"]){
		getCounties();
		if(array_key_exists($_GET["county"],$counties)){
			$countyId = $counties[$_GET["county"]];
			$filter = sprintf(" AND (`election2016-races`.countyId LIKE '%u' OR `election2016-races`.countyId LIKE '%%,%u,%%' OR `election2016-races`.countyId LIKE '%%,%u' OR `election2016-races`.countyId LIKE '%u,%%')",$countyId,$countyId,$countyId,$countyId);
			$query = $query.$filter;
		}
	}

	$query = $query." ORDER BY `election2016-races`.priorityOrder, `election2016-races`.section, `election2016-candidates`.party, `election2016-candidates`.color";

	$sections = array();
	if ($result = mysqli_query($conn, $query)) {
		while ($row = mysqli_fetch_assoc($result)) {
			$section = $row['raceSection'];
			if($sections[$section] == null){
				$sections[$section] = array();
			}

			$index = getRace($sections[$section], $row["raceId"]);
			
			if(intVal($row["raceCalled"]) == 1){
				$isCalled = true;
			}
			else{
				$isCalled = false;
			}

			if(intVal($row["hasIcon"]) == 1){
				$hasIcon = true;
			}
			else{
				$hasIcon = false;
			}

			if($index != -1){
				$sections[$section][$index]["candidates"][$row["name"]] = array(
					"party" => $row["party"],
					"color" => $row["color"],
					"iconURL" => $row["iconURL"],
					"hasIcon" => $hasIcon,
					"votesPercent" => floatval($row["votesPercent"])
				);
			}
			else{
				$sections[$section][] = array(
					"id" => $row["raceId"],
					"name" => $row["raceName"],
					"enrId" => $row["enrId"],
					"segmentType" => $row["segmentType"],
					"segmentsReporting" => intval($row["segmentsReporting"]),
					"totalSegments" => intval($row["totalSegments"]),
					"called" => $isCalled,
					"candidates" => array()
				);

				$sections[$section][sizeof($sections[$section])-1]["candidates"][$row["name"]] = array(
					"party" => $row["party"],
					"color" => $row["color"],
					"iconURL" => $row["iconURL"],
					"hasIcon" => $hasIcon,
					"votesPercent" => floatval($row["votesPercent"])
				);
			}
		}
	}

	echo json_encode($sections);
	mysqli_close($conn);
}

function getCounties(){
	global $conn;
	global $counties;
	$counties = array();
	$query = "SELECT * FROM `election2016-counties`";
	if ($result = mysqli_query($conn, $query)) {
		while ($row = mysqli_fetch_assoc($result)) {
			$counties[$row["name"]] = $row["id"];
		}
	}
}

function getRace($section, $raceId){
	for ($i = 0; $i < sizeof($section); $i++) {
		if($section[$i]["id"] == $raceId){
			return $i;
		}
	}
	return -1;
}


?>