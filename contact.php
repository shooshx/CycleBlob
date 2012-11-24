<!doctype html>
<html><head>
    <title>Cycleblob - Feedback</title>
    <meta http-equiv="content-type" content="text/html; charset=UTF8">
    <link rel="stylesheet" type="text/css" href="page.css">
    <link href="favicon.ico" rel="shortcut icon">
    <meta name="description" content="Cycleblob, A WebGL lightcycle game based on the concept of the movie TRON. written by Shy Shalom">
<script type="text/javascript">
  var _gaq = _gaq || [];
  _gaq.push(['_setAccount', 'UA-2231125-3']);
  _gaq.push(['_trackPageview']);
  (function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
  })();
</script>
</head>
<body>
<div id="textpage">
    <h1>Feedback</h1>

<?php

function getClientAddr() {
    if ( isset($_SERVER["HTTP_CLIENT_IP"]) )    {
        return $_SERVER["HTTP_CLIENT_IP"] . ' ';
    } else if ( isset($_SERVER["HTTP_X_FORWARDED_FOR"]) )    {
        return $_SERVER["HTTP_X_FORWARDED_FOR"] . ' ';
    } else if ( isset($_SERVER["REMOTE_ADDR"]) )    {
        return $_SERVER["REMOTE_ADDR"] . ' ';
    }
    return "[unknown]";
}

function getBrowserInfo() {
    return $_SERVER['HTTP_USER_AGENT'];
}
    
$showform = true;
#msg = "";
if(isset($_POST['submit'])) { 
    $message = $_POST['message'];
    $trimmsg = trim($message);
    if (!empty($trimmsg)) {
        $to = "cycleblob@gmail.com";
        date_default_timezone_set("UTC");
        $subject = "Cycleblob feedback " . date("d M Y G:i:s e");
        $name_field = $_POST['name'];
        $email_field = $_POST['email'];
    
        $ip = getClientAddr();
        $browser = getBrowserInfo();
        $body = "From:$name_field\nE-Mail:$email_field\nIP:$ip\nBrowser:$browser\nMessage:\n$message";
         
        if(mail($to, $subject, $body)) {
            $msg =  "Email sent to $to!";
        }
        else {
            $msg = "Email could not be sent.";
        }
        $showform = false;
    }
} 

if ($showform) { ?>

    <p>Cycleblob was created by Shy Shalom as a personal project to learn WebGL and JavaScript. You can contact me at <a href="mailto:cycleblob@gmail.com">cycleblob@gmail.com</a>
    or simply use the following form</p>
    <form method="POST" action="contact.php">
        <table>
            <tr><td><label for="name">Name:</label></td><td><input id="name" class="txtin" type="text" name="name" size="30"></td></tr>
            <tr><td><label for="email">Email:</label></td><td><input id="email" class="txtin" type="text" name="email" size="30"></td></tr>
        </table>
        <label for="message">Message:</label><br>
        <textarea rows="9" class="txtin" id="message" name="message" cols="50"></textarea>
        <br>
        <input id="submitBot" type="submit" value="Submit" name="submit">
    </form>
    <p id="backToGame"><a href="/">Go back to the game</a></p>

<?php
}
else {
?>
    <p><?php echo $msg ?><br/></p>
    <p id="backToGame"><a href="/">Go back to the game</a></p>

<?php
}
?>

</div>
<div id="feedback">
    <a href="about.php">About</a>&nbsp;&nbsp;&nbsp;<a href="/">Game</a>
</div>
</body>
</html>
