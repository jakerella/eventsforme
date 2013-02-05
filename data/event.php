<?php
$data = array(
  array(
    'id' => 1, 
    'title' => 'Sorta cool, I guess', 
    'description' => 'Lorem ipsum et tu brute, cut pudelag utip hethen.', 
    'category' => 'Event',
    'link' => 'http://jordankasper.com',
    'location' => null, 
    'start' => "2013-08-06 14:50:00", 
    'end' => null,
    'lat' => null,
    'lng' => null
  ),
  array(
    'id' => 2,
    'title' => 'Super awesome fun time', 
    'description' => 'Lorem ipsum et tu brute, cut pudelag utip hethen.', 
    'category' => 'Party',
    'link' => 'http://memphis.com',
    'location' => 'Downtown Memphis',
    'start' => "2013-02-15 18:00:00", 
    'end' => "2013-02-15 19:00:00",
    'lat' => 35.1494,
    'lng' => 90.0489
  ),
  array(
    'id' => 3, 
    'title' => 'Sencha con', 
    'description' => 'Lorem ipsum et tu brute, cut pudelag utip hethen.', 
    'category' => 'Conference',
    'link' => 'http://www.sencha.com/conference',
    'location' => null, 
    'start' => "2013-07-16 00:00:00", 
    'end' => "2013-07-19 23:59:59", 
    'lat' => null,
    'lng' => null
  ),
  array(
    'id' => 4,
    'title' => 'What the what?', 
    'description' => 'Lorem ipsum et tu brute, cut pudelag utip hethen.', 
    'category' => 'Party',
    'link' => 'http://memphis.com',
    'location' => 'Party House',
    'start' => "2013-02-06 08:00:00", 
    'end' => "2013-02-07 19:00:00",
    'lat' => 35.1494,
    'lng' => 90.0489
  )
);

if (isset($_GET['id']) && isset($data[$_GET['id']-1])) {
  
  // header("HTTP/1.1 404 I can't do that...");
  // echo "404 I can't do that...";
  // exit;

  $data = array($data[$_GET['id']-1]);
}


header('Content-Type: application/json');

$result = array(
  'success' => true,
  'results' => $data
);

echo json_encode($result);
?>