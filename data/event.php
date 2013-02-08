<?php
$data = array(
  array(
    'id' => 'sp-20130806-5678',
    'title' => 'Sorta cool, I guess',
    'description' => 'Lorem ipsum et tu brute, cut pudelag utip hethen.',
    'category' => 'Event',
    'link' => 'http://jordankasper.com',
    'location' => null,
    'start' => "2013-08-06 14:50:00",
    'end' => null,
    'lat' => 35.123349,
    'lng' => -89.991245
  ),
  array(
    'id' => 'mu-20130215-1234',
    'title' => 'Super awesome fun time', 
    'description' => 'Lorem ipsum et tu brute, cut pudelag utip hethen.', 
    'category' => 'Party',
    'link' => 'http://memphis.com',
    'location' => 'Downtown Memphis',
    'start' => "2013-02-15 18:00:00", 
    'end' => "2013-02-15 19:00:00",
    'lat' => 35.141810,
    'lng' => -90.050125
  ),
  array(
    'id' => 'or-20130716-666',
    'title' => 'Sencha con', 
    'description' => 'Lorem ipsum et tu brute, cut pudelag utip hethen.', 
    'category' => 'Conference',
    'link' => 'http://www.sencha.com/conference',
    'location' => null, 
    'start' => "2013-07-16 00:00:00", 
    'end' => "2013-07-19 23:59:59", 
    'lat' => 35.117100,
    'lng' => -89.938545
  ),
  array(
    'id' => 'mu-20130208-5309',
    'title' => 'What the what?', 
    'description' => 'Lorem ipsum et tu brute, cut pudelag utip hethen.', 
    'category' => 'Party',
    'link' => 'http://memphis.com',
    'location' => 'Party House',
    'start' => "2013-02-08 08:00:00", 
    'end' => "2013-02-09 19:00:00",
    'lat' => 35.144056,
    'lng' => -89.986954
  )
);

if (isset($_GET['id'])) {
  
  // header("HTTP/1.1 404 I can't do that...");
  // echo "404 I can't do that...";
  // exit;

  $newData = array();
  foreach ($data as $rec) {
    if ($rec['id'] == $_GET['id']) {
      $newData = $rec;
      break;
    }
  }
  $data = $newData;
}


header('Content-Type: application/json');

$result = array(
  'success' => true,
  'results' => $data
);

echo json_encode($result);
?>