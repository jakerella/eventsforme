<?php
abstract class EventSource {

  const DEFAULT_DAYS = 7;
  const DEFAULT_DIST = 10;

  public static $defaultParams = array(
    'terms'=>null, 
    'loc'=>null, 
    'lat'=>null, 
    'lng'=>null, 
    'time'=>self::DEFAULT_DAYS, 
    'dist'=>self::DEFAULT_DIST, 
    'page'=>1
  );

  public $logger = null;

  public function __construct($logger = null) {
    $this->logger = $logger;
  }

  protected function log($msgOrException, $level = null) {
    if ($this->logger) {
      return $this->logger->log($msgOrException, $level);
    }
    return null;
  }

  public function getGUID($sId, $start) {
    return $this->getGUIDPrefix().'-'.date('Ymd', $start).'-'.$sId;
  }

  public function getSourceId($guid) {
    $sId = null;
    $m = array();
    if (preg_match("/^".$this->getGUIDPrefix()."\-[0-9]{8}\-(.+)$/", $guid, $m)) {
      $sId = $m[1];
    }
    return $sId;
  }

  /**
   * Get the prefix for GUIDs
   * @return string The two character prefix
   */
  abstract public function getGUIDPrefix();

  /**
   * Gets all events for this source given the params provided
   * @param  array $params See defaultParams for possible values (although other are permitted)
   * @return array         The array of events, see getEventByGUID for an example of valid Event data
   */
  abstract public function getEvents(array $params = null);

  /**
   * Gets one event by it's GUID, below is valid Event data:
   *   array(
   *     'id' => GUID,
   *     'title' => string,
   *     'description' => HTML,
   *     'category' => string,
   *     'source' => string,
   *     'link' => URL,
   *     'location' => string,
   *     'address' => string,
   *     'tickets' => boolean,
   *     'cost' => float,
   *     'start' => 'Y-m-d H:i:s' or null,
   *     'end' => 'Y-m-d H:i:s' or null,
   *     'lat' => float,
   *     'lng' => float
   *   );
   * @param  string $guid The GUID to find
   * @return array        The Event data (see above)
   * @throws InvalidArgumentException, NotFoundException
   */
  abstract public function getEventByGUID($guid);

}

if (!class_exists('NotFoundException')) {
  class NotFoundException extends Exception {
    public function __construct($msg = "", $code = 404) {
      parent::__construct($msg, $code);
    }
  }
}
if (!class_exists('BadRequestException')) {
  class BadRequestException extends Exception {
    public function __construct($msg = "", $code = 400) {
      parent::__construct($msg, $code);
    }
  }
}
if (!class_exists('BadResponseException')) {
  class BadResponseException extends Exception {
    public function __construct($msg = "", $code = 400) {
      parent::__construct($msg, $code);
    }
  }
}
?>