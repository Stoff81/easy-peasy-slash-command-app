/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 ______    ______    ______   __  __    __    ______
 /\  == \  /\  __ \  /\__  _\ /\ \/ /   /\ \  /\__  _\
 \ \  __<  \ \ \/\ \ \/_/\ \/ \ \  _"-. \ \ \ \/_/\ \/
 \ \_____\ \ \_____\   \ \_\  \ \_\ \_\ \ \_\   \ \_\
 \/_____/  \/_____/    \/_/   \/_/\/_/  \/_/    \/_/


 This is a sample Slack Button application that provides a custom
 Slash command.

 This bot demonstrates many of the core features of Botkit:

 *
 * Authenticate users with Slack using OAuth
 * Receive messages using the slash_command event
 * Reply to Slash command both publicly and privately

 # RUN THE BOT:

 Create a Slack app. Make sure to configure at least one Slash command!

 -> https://api.slack.com/applications/new

 Run your bot from the command line:

 clientId=<my client id> clientSecret=<my client secret> PORT=3000 node bot.js

 Note: you can test your oauth authentication locally, but to use Slash commands
 in Slack, the app must be hosted at a publicly reachable IP or host.


 # EXTEND THE BOT:

 Botkit is has many features for building cool and useful bots!

 Read all about it here:

 -> http://howdy.ai/botkit

 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

/* Uses the slack button feature to offer a real time bot to multiple teams */
var Botkit = require('botkit');
var https = require('https');

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.PORT || !process.env.VERIFICATION_TOKEN) {
    console.log('Error: Specify CLIENT_ID, CLIENT_SECRET, VERIFICATION_TOKEN and PORT in environment');
    process.exit(1);
}

var config = {}
if (process.env.MONGOLAB_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    config = {
        storage: BotkitStorage({mongoUri: process.env.MONGOLAB_URI}),
    };
} else {
    config = {
        json_file_store: './db_slackbutton_slash_command/',
    };
}

var controller = Botkit.slackbot(config).configureSlackApp(
    {
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        scopes: ['commands'],
    }
);

controller.setupWebserver(process.env.PORT, function (err, webserver) {
    controller.createWebhookEndpoints(controller.webserver);

    controller.createOauthEndpoints(controller.webserver, function (err, req, res) {
        if (err) {
            res.status(500).send('ERROR: ' + err);
        } else {
            res.send('Success!');
        }
    });
});


//
// BEGIN EDITING HERE!
//

controller.on('slash_command', function (slashCommand, message) {

    switch (message.command) {
        case "/random_user":
            if (message.token !== process.env.VERIFICATION_TOKEN) return; //just ignore it.

            if (message.text === "help") {
              slashCommand.replyPrivate(message,
                "I can find you a random slack user in the current channel. " +
                "\n`/random_user` - Ask me for a random user, its dramatic." +
                "\n`/random_user work ...(e.g do the dishes)` - I will pick a random person to do the dishes.");
                return;
              }

            if (message.text.startsWith("work ")) {
              var work = message.text.substring(5);

              function step1() {
                var user = getRandomUserForChannel(message.channel, function(user){
                  slashCommand.replyPublicDelayed(message, "Hey, " + user + " you have been selected to " + work + ". Get to it, or else :gun::sweat_smile:");
                })
              }

              slashCommand.replyPrivate(message, "Finding someone to " + work)
              setTimeout(step1, 1000);
              return;
            } else {
                doRandomUser(slashCommand, message);
            }

            return;
        default:
            slashCommand.replyPrivate(message, "I'm afraid I don't know how to " + message.command + " yet.");

    }
});

function doRandomUser(slashCommand, message){
  function step1() {
    slashCommand.replyPrivateDelayed(message, "Shuffling the deck...");
  }

  function step2() {
    getRandomUserForChannel(message.channel, function(user){
      slashCommand.replyPrivateDelayed(message, 'Found you a random user:' + user + ' :tada:');
    })
  }

  slashCommand.replyPrivate(message, "Finding the cards...")
  setTimeout(step1, 1000);
  setTimeout(step2, 3000);
}

function getRandomUserForChannel(channel, callback){
  var options = {
    host: 'slack.com',
    path: '/api/channels.info?' +
          'token=xoxp-2156145196-4532874081-99178606065-3b0117a5e9f7c42dabfc4e2632cb5ecf' +
          '&channel=' + channel,
    method: 'GET',
    headers: {
      accept: '*/*'
    }
  };
  var request =  https.get(options, function(response) {
      response.on('data', function(d) {
        var jsonObject = JSON.parse(d);
        var channel = jsonObject["channel"]
        var members = channel["members"]
        var random_user = members[Math.floor(Math.random()*members.length)];
        var user = "<@"+random_user+">"

        callback(user)
    })
  })
}
