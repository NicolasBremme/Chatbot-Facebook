'use strict';

const VERIFY_TOKEN = "EAAFDmBZCfuxQBAMGHVM2AdxVn9x9MoP3qEcV4dFcZCr4NpiMM3vQsnrHgXfuwqGgxK1J6SCHGZA6KrjZBDPKcYNTGLRHVyv9DawNqo7jKVKhvS9EqW6paTej0cNOyuBcM78KlTH32RnrIoPbJRClGO2ujhA9o4aqrU0xcBCgDQZDZD";
// Imports dependencies and set up http server
const
  request = require('request'),
  express = require('express'),
  bodyParser = require('body-parser'),
  validUrl = require('valid-url');

let app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({"extended": false}));

let port = (process.env.PORT || 5000);
app.set('port', port);
app.listen(port, () => console.log('WEBHOOK_OK'));

app.post('/webhook/', function (req, res) {
    console.log("WEBHOOK_EVENT_RECEIVED");
    let messaging_events = req.body.entry[0].messaging;
    for (let i = 0; i < messaging_events.length; i++) {
        let event = messaging_events[i]
        let sender = event.sender.id
        if (event.message && event.message.text) {
            console.log("Received.");
            checkURL(sender, event.message.text);
        }
        else if (event.postback && event.postback.payload) {
            let payload = event.postback.payload;
            sendTextMessage(sender, payload);
        }
    }
    res.sendStatus(200)
});

app.get('/webhook/', (req, res) => {

    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
          console.log('WEBHOOK_VERIFIED');
          res.status(200).send(challenge);
        } else {
          console.log('WEBHOOK_ERROR');
          res.sendStatus(403);
        }
    }
});

function checkURL(sender, text)
{
    console.log("message: " + text);
    if (validUrl.isUri(text)){
        console.log('Looks like an URI');
        //------------------------------------------------------------// Test 1 bouttons
        sendTextMessage(sender, "Choisissez la catégorie :");
        createBtn1(sender, "Type 1:", "Acquisition", "acquisition");
        createBtn1(sender, "Type 2:", "Retention", "retention");
        createBtn1(sender, "Type 3:", "Uncategorized", "uncategorized");
        createBtn1(sender, "Type 4:", "Viralité", "viralité");
        //------------------------------------------------------------// Test 2 bouttons
    } else {
        console.log('Not a URI');
    }
}

function createBtn1(sender, text, title, payload)
{
    let btnData = {
        "type": "template",
        "payload": {
            "template_type": "button",
            "text": text,
            "buttons": [
                {
                "type": "postback",
                "title": title,
                "payload": payload
                }
            ]
        }
    };
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:VERIFY_TOKEN},
        method: 'POST',
        json: {
            recipient: {id:sender},
            "message": {attachment:btnData}
        }
    }, function(error, response, body) {
          if (error) {
              console.log('Error creating button: ', error);
          } else if (response.body.error) {
              console.log('Error: ', response.body.error);
          }
    });
}
function createBtn2(sender)
{
    let btnData = {
        "type": "template",
        "payload": {
            "template_type": "button",
            "text": "Choisissez la catégorie:",
            "buttons": [
                {
                "type": "postback",
                "title": "Acquisition",
                "payload": "acquisition"
                },
                {
                "type": "postback",
                "title": "Retention",
                "payload": "retention"
                }
            ],
            "buttons": [
                {
                "type": "postback",
                "title": "Uncategorized",
                "payload": "uncategorized"
                },
                {
                "type": "postback",
                "title": "Viralité",
                "payload": "viralité"
                }
            ]
        }
    };
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:VERIFY_TOKEN},
        method: 'POST',
        json: {
            recipient: {id:sender},
            "message": {attachment:btnData}
        }
    }, function(error, response, body) {
          if (error) {
              console.log('Error creating button: ', error);
          } else if (response.body.error) {
              console.log('Error: ', response.body.error);
          }
    });
}

function sendTextMessage(sender, text)
{
    let messageData = {
      text:text
    };
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:VERIFY_TOKEN},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    });
}
