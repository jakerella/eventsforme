<?php

require_once('EventSource.php');

class TestSource extends EventSource {

  private static $data = array(
    array(
      'id' => 'ts-20130806-5678',
      'title' => 'Sorta cool, I guess',
      'description' => 'Lorem ipsum et tu brute, cut pudelag utip hethen.',
      'category' => 'Event',
      'source' => 'Test',
      'link' => 'http://jordankasper.com',
      'location' => null,
      'address' => 'Cooper and Young, Memphis, TN',
      'tickets' => false,
      'cost' => null,
      'start' => "2013-08-06 14:50:00",
      'end' => null,
      'lat' => 35.123349,
      'lng' => -89.991245
    ),
    array(
      'id' => 'ts-20130215-1234',
      'title' => 'Super awesome fun time', 
      'description' => 'Lorem ipsum et tu brute, cut pudelag utip hethen.', 
      'category' => 'Party',
      'source' => 'Test',
      'link' => 'http://memphis.com',
      'location' => 'Downtown Memphis',
      'address' => null,
      'tickets' => false,
      'cost' => null,
      'start' => "2013-02-25 18:00:00", 
      'end' => "2013-02-25 19:00:00",
      'lat' => 35.141810,
      'lng' => -90.050125
    ),
    array(
      'id' => 'ts-20130716-666',
      'title' => 'Sencha con', 
      'description' => 'Lorem ipsum et tu brute, cut pudelag utip hethen.', 
      'category' => 'Conference',
      'source' => 'Test',
      'link' => 'http://www.sencha.com/conference',
      'location' => null, 
      'address' => null,
      'tickets' => true,
      'cost' => 475.00,
      'start' => "2013-07-16 00:00:00", 
      'end' => "2013-07-19 23:59:59", 
      'lat' => 35.117100,
      'lng' => -89.938545
    ),
    array(
      'id' => 'ts-20130208-5309',
      'title' => 'What the what?', 
      'description' => 'Lorem ipsum et tu brute, cut pudelag utip hethen.', 
      'category' => 'Party',
      'source' => 'Test',
      'link' => 'http://memphis.com',
      'location' => 'Party House',
      'address' => '1000 Front, Memphis, TN',
      'tickets' => false,
      'cost' => 20.00,
      'start' => "2013-02-15 08:00:00", 
      'end' => "2013-02-16 19:00:00",
      'lat' => 35.144056,
      'lng' => -89.986954
    )
  );

  public function __contruct($logger = null) {
    parent::__construct($logger);

    $this->name = 'Test Data';
    $this->site = 'http://eventsfor.me';
    $this->defaultCategory = 'Test';
    $this->guidPrefix = 'ts';
  }

  public function getEvents(array $params = null) {
    return self::$data;
  }

  public function getEventByGUID($guid) {
    foreach (self::$data as $event) {
      if ($event['id'] == $guid) {
        return $event;
      }
    }
    throw new NotFoundEception("Cannot find Test event with ID: {$guid}");
  }

}

?>