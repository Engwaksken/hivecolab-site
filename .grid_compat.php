<?php
// PHP Bootstrap file to restore common environment variables used on the grid platform
$_ENV["DATABASE_SERVER"]=$_SERVER["DATABASE_SERVER"];
$_ENV["SITE_ROOT"]=$_SERVER["DOCUMENT_ROOT"];
$_ENV["SITE_CGIROOT"]=$_SERVER["DOCUMENT_ROOT"] . "/cgi-bin";
$_ENV["SITE_HTMLROOT"]=$_SERVER["DOCUMENT_ROOT"];
?>
