<?php

echo "Starting CouchDB Cache test<br />";

require_once('CouchCache.php');
 
try {
  $cache = new CouchCache("test-cache");

  echo "current cache:<br />";
  var_dump($cache->getAll());

  $id = 'test-data-'.time();
  $item = array(
    '_id' => $id,
    'title' => 'test data',
    'value' => 'this is the value',
    'details' => array(
      'time' => time(),
      'loc' => 'Memphis'
    )
  );
  echo "<br /><br />creating cache item with:<br />".json_encode($item)."<br />";
  var_dump($cache->create($id, $item));

  // $id = "search-35.12--89.99-7-10-1";
  echo "<br /><br />getting last created cache item:<br />";
  $item = $cache->getById($id);
  var_dump($item);

  echo "<br /><br />updating last item with: loc=Nashville<br />";
  $item->details->loc = "Nasvhille";
  var_dump($cache->update($id, $item));

  echo "<br /><br />getting updated cache item:<br />";
  $resp = $cache->getById($id);
  var_dump($resp);

  echo "<br /><br />deleting last created cache item:<br />";
  var_dump($cache->deleteById($id));
  
  echo "<br /><br />creating cache item with low TTL:<br />".json_encode($item)."<br />";
  $id .= "-exp";
  $item->_id = $id;
  var_dump($cache->create($id, $item, 5));

  echo "<br /><br />waiting 6 secs, then getting new item (should be expired)<br />";
  try {
    sleep(6);
    $item = $cache->getById($id);
    var_dump($item);
  } catch (NotFoundException $nfe) {
    echo('<br />NotFound: ('.$nfe->getCode().') '.$nfe->getMessage().'<br />');
  }

  //Careful with this one...
  // echo "<br /><br />deleting entire cache DB:<br />";
  // var_dump($cache->deleteAll());


} catch(Exception $e) {
  echo('<br /><br />Couch error: '.get_class($e)." (".$e->getCode().") ".$e->getMessage().'<br />');
}

echo "<br /><br />TEST COMPLETE";

?>