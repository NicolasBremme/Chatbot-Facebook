'use strict';

const VERIFY_TOKEN = "EAAGCK9WZBPQoBAFtfBeE2c0AaEBZBXiDVx2QIURpDtlgm2aotslZApzOmyHpxo1w2tMTXGyPeAQ7id1BOoVxulnaivH4QN7aS5sj3p2Q8FUIobUQlZBODdkZADTZB4Xj1fBYqvChZCtdc6M77a82A619ZBea1dPmqFNJRYmKJ3YnQQZDZD",
    appUrl = "https://test--chatbot.herokuapp.com/",
    pathToFiles = "/";
const kuratorUrl = "https://app.posteria.fr",
    imageUrl = "http://image-kurator.fr/app";
const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require('constants');
const { response } = require('express');
const { fstat } = require('fs');
const path = require('path');
//  Imports dependencies and set up http server
const
    request = require('request'),
    express = require('express'),
    bodyParser = require('body-parser'),
    validUrl = require('valid-url'),
    crypto = require('crypto');

let app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({"extended": false}));

let port = (process.env.PORT || 5000);
app.set('port', port);
app.listen(port, () => console.log('WEBHOOK_OK'));

const getRandom = (min, max) => (Math.floor(Math.random() * ((max - min) + min)));

//Quand catégories ok
var rewardsCategoriesOk = [
    "Super ! \u{1F60F}",
    "Catégorie validée ! \u{1F603}",
    "Great job \u{1F609}",
	"Bon boulot \u{1F601}",
	"Bonne déduction \u{1F638}",
	"Excellent choix de catégorie \u{1F609}",
	"Catégorie(s) acceptée(s) \u{1F61C}",
	"Good \u{1F61C}",
	"Très bien \u{1F609}",
	"Perfect \u{1F60F}",
	"Epatant \u{1F60A}",
	"Vous faites un travail admirable \u{1F603}"
];

//Quand insight ok
var rewardsInsightOk = [
    "Super commentaire \u{1F604}",
    "Génial ! \u{1F603}",
    "Commentaire validé \u{1F60F}",
	"Commentaire intéressant ! \u{1F60F}",
	"Great ! \u{1F63A}",
	"Great work ! \u{1F60F}",
	"Excellent \u{1F440}",
	"Très bien \u{1F609}",
	"Geniiiial \u{1F604}",
	"Good commentary \u{1F60A}",
	"Très intéressant ! \u{1F642}",
	"Very interesting! \u{1F44A}",
	"Beau travail ! \u{1F607}"
];

//Quand publication OK
var rewardsPublishOk = [
    "Bravooo \u{1F60F}",
    "Goooaaaal \u{1F603}",
    "Good game ! \u{1F604}",
	"Au top \u{1F917}",
	"Bien joué ! \u{1F60A}",
	"Congratulatiiion \u{1F389}",
	"Votre article vient d’être publié \u{1F60C}",
	"Félicitation \u{1F44C}",
	"Vous avez réussi votre publication ! \u{1F604}",
	"Article published \u{1F642}",
	"Excellent travail \u{2705}",
	"Parfait \u{1F63B}",
	"Bravo !!!!!! \u{1F340}"
];

var allUsers = {};

app.get('/webhook/', (req, res) => {

    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        }
        else {
            console.log('WEBHOOK_ERROR');
            res.sendStatus(403);
        }
    }
});

app.get('/loginPosteria/', (req, res) => {
    let code = null;
    let user = null;
    let sender = null;

    if (null != req.query.code) {
        code = parseInt(req.query.code, 10);
    }
    if (null != req.query.sender) {
        sender = parseInt(req.query.sender, 10);
        user = allUsers[sender];
    }
    if (user != null && user.isConnected == 0) {
        if (code == 1 && sender != null) {
            getCategoriesAndAuthors(user);
        }
        else {
            sendTextMessage(user, {text: 'Impossible de vous connecter à Kurator.'});
        }
    }

    res.sendFile(pathToFiles + "loginPosteria.html");
});

app.post('/webhook/', function (req, res) {
    console.log("WEBHOOK_EVENT_RECEIVED");
    let messaging_events = req.body.entry[0].messaging;
    var stepsDetails = [
        {"event_type" : ["message", "attachments"], "function": checkURL},
        {"event_type" : ["postback"], "function": getSelectedCategory},
        {"event_type" : ["message"], "function": getDescLong},
        {"event_type" : ["postback"], "function": getSelectedAuthor},
        {"event_type" : ["postback"], "function": getSelectedTime},
    ];

    for (let i = 0; i < messaging_events.length; i++) {
        let event = messaging_events[i];
        let sender = event.sender.id;

        if (undefined === allUsers[sender]) {
            allUsers[sender] = {
                sender: sender,
                step: 0,
                isConnected: 0,
                articleUrl: "",
                platform: "",
                allCategories: [],
                allCategoriesId: [],
                allAuthors: [],
                allAuthorsId: [],
                tags: [],
                categorie: -1,
                descLong: "",
                author: "",
                title: "",
                image: "",
                desc: "",
                time: "",
            };
        }

        let eventType = getEventType(event, allUsers[sender]);
        let currentStep = stepsDetails[allUsers[sender].step];

        if (currentStep.event_type.includes(eventType)) {
            currentStep.function(allUsers[sender], event);
        }
    }
    res.sendStatus(200)
});

function getSelectedAuthor(user, event) {
    let payload = event.postback.payload;

    if (user.platform != 'wordpress' || typeof(user.allAuthorsId[parseInt(payload, 10)]) == "undefined") {
        return;
    }

    user.author = user.allAuthorsId[parseInt(payload, 10)];
    user.step++;
    showPostInfo(user);
}

function getSelectedTime(user, event) {
    let payload = event.postback.payload;

    user.time = payload;

    if (user.time == "stop") {
        sendTextMessage(user, {text: "Ok, la publication est annulée."});
        delete allUsers[user.sender];
        return;
    }

    let postInfos = {
        extern_id: user.sender,
        title: user.title,
        description: user.desc,
        image: user.image,
        link: user.articleUrl,
        categories: [user.categorie],
        author: user.author,
        userDesc: user.descLong,
        time: user.time
    };
    console.log(user);
    console.log(postInfos);

    posteriaRequest('/api/addArticlesChatBot', postInfos, function(err, res, body) {
        try {
            body = JSON.parse(body);
            let sender = parseInt(body.sender);

            if (body.hasError == false) {
                sendTextMessage(allUsers[sender], {text: rewardsPublishOk[getRandom(0, rewardsPublishOk.length)]});
                delete allUsers[sender];
                return;
            }
            sendTextMessage(allUsers[sender], {text: body.error});
            delete allUsers[sender];
        }
        catch (error) {
            console.log('[2] ' + error);
            console.log("Une erreur s'est produite lors de l'enregistrement de l'article");
            delete allUsers[sender];
        }
    });
}

function getEventType(event) {
    if (event.postback && event.postback.payload) {
        return "postback";
    }
    if (event.message && event.message.text) {
        if (event.message.text == 'reset') {
            delete allUsers[user.sender];
            return "none";
        }
        return "message";
    }
    if (event.message && event.message.attachments) {
        return "attachment";
    }
    return "none";
}

function checkURL(user, event) {
    let text = "null";

    if (event.message && event.message.text) {
        text = event.message.text;
    }
    else if (event.message && event.message.attachments) {
        let url = event.message.attachments[0].url;

        if(typeof url != 'undefined') {
            url = decodeURIComponent(url.split('u=')[1].split('&h=')[0]);
            text = url;
        }
    }

    if (!validUrl.isUri(text)) {
        return;
    }

    user.articleUrl = text;
    user.step++;

    let reqParam = {
        url: text,
        sender: user.sender
    };

    posteriaRequest("/api/getArticleInfo", reqParam, function(err, res, body) {
        try {
            body = JSON.parse(body);
            let sender = parseInt(body.sender);
            
            if (body.hasError == true || body.parseError == true) {
                if (body.error == 'Cannot parse the article.') {
                    body.error = "Nous n\'avons pas pu récupérer l\'article \u{1F614} Nous manquons d\'informations";
                }
                sendTextMessage(allUsers[sender], {text: body.error});
                delete allUsers[sender];
                return;
            }

            allUsers[sender].image = body.image;
            allUsers[sender].title = body.title;
            allUsers[sender].desc = body.description;
            posteriaRequest('/api/autoLogin', {extern_id: sender}, function(err, res, body) {
                try {
                    body = JSON.parse(body);

                    let sender = body.sender;
                    let isLogged = body.logged;

                    if (body.hasError == true) {
                        console.log('[5] ' + body.error);
                        sendTextMessage(allUsers[sender], {text: "Une erreur s'est produite."});
                        delete allUsers[sender];
                        return;
                    }

                    if (sender == null) {
                        sendTextMessage(user, {text: 'Impossible de vous connecter à Kurator.'});
                        return;
                    }

                    if (isLogged) {
                        getCategoriesAndAuthors(allUsers[sender]);
                        return;
                    }

                    createBtn(allUsers[sender], {
                        attachment: {
                            type: "template",
                            payload: {
                                template_type: "button",
                                text: "Bonjour, veuillez vous connecter à Posteria",
                                buttons: [{
                                    type: "web_url",
                                    url: kuratorUrl + '/api/authorize?extern_id=' + sender,
                                    title: "Connexion"
                                }]
                            }
                        }
                    });
                }
                catch (error) {
                    console.log('[4] ' + error);
                    sendTextMessage(allUsers[sender], {text: "Une erreur s'est produite."});
                    delete allUsers[sender];
                }
            });
        }
        catch (error) {
            console.log('[3] ' + error);
            sendTextMessage(allUsers[sender], {text: "Une erreur s'est produite."});
            delete allUsers[sender];
        }
    });
}

function getCategoriesAndAuthors(user) {
    posteriaRequest('/api/getCategoriesAndAuthors', {extern_id: user.sender}, function(err, res, body) {
        try {
            body = JSON.parse(body);
            let sender = parseInt(body.sender);
            
            allUsers[sender].platform = body.platform;

            allUsers[sender].tags = body.tags;

            for (const property in body.categories) {
                allUsers[sender].allCategories.push(property);
                allUsers[sender].allCategoriesId.push(body.categories[property]);
            }

            if (allUsers[sender].platform == 'wordpress') {
                for (const property in body.authors) {
                    allUsers[sender].allAuthors.push(body.authors[property].username);
                    allUsers[sender].allAuthorsId.push(property);
                }
            }
            askCategories(allUsers[sender]);
        }
        catch (error) {
            console.log('[1] ' + error);
            sendTextMessage(allUsers[sender], {text: "Une erreur s'est produite. [2]"});
            delete allUsers[sender];
            return;
        }
    });
}

function askCategories(user) {
    let btnCount = Math.ceil(user.allCategories.length / 3);
    let btnData = [];

    for (let i = 0, j = 0; i < btnCount; i++) {
        btnData.push({
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "button",
                    "text": "",
                    "buttons": []
                }
            }
        });
        btnData[i].attachment.payload.text = (i == 0) ? "Choisissez une catégorie :" : "‎";
        for (j = 0; j < 3 && user.allCategories[(i * 3) + j]; j++) {
            let buttons = btnData[i].attachment.payload.buttons;

            buttons.push({"type": "postback", "title": "", "payload": ""});
            buttons[j].title = user.allCategories[(i * 3) + j];
            buttons[j].payload = (i * 3) + j;
        }
    }
    let index = 0;
    let indexLimit = btnData.length - 1;
    createBtn(user, btnData, index, indexLimit, createBtn);
}

function getSelectedCategory(user, event) {
    let payload = event.postback.payload;

    if (typeof(user.allCategoriesId[parseInt(payload, 10)]) == "undefined") {
        return;
    }
    user.categorie = user.allCategoriesId[parseInt(payload, 10)];
    user.step++;
    askLong(user);
}

function askLong(user) {
    const textDescLong = {text: rewardsCategoriesOk[getRandom(0, rewardsCategoriesOk.length)] + " Entrez votre description :"};

    sendTextMessage(user, textDescLong);
}

function getDescLong(user, event) {
    let message = event.message.text;

    if (message.length == 0) {
        return;
    }

    user.descLong = hashtagify(user, message);
    if (user.platform == 'wordpress') {
        askAuthor(user);
        user.step++;
        return;
    }
    showPostInfo(user);
    user.step += 2;
}

function hashtagify(user, text) {
    if (user.platform == "wall") {
        return text;
    }
    let hashtags = Object.keys(user.tags);
    let authorizedEndingChar = ['.', ' ', ','];

    for (let i = 0; i < hashtags.length; i++) {
        let t = hashtags[i];
        let index = text.toLowerCase().indexOf(t.toLowerCase());

        if (index !== -1) {
            if (index == 0) {
                text = '#' + text.substr(index,1).toUpperCase() +text.substr(1) ;
            }
            else if (text.substr(index - 1, 1) != '#' && text.substr(index - 1, 1) == ' ' &&
                (authorizedEndingChar.indexOf(text.substr(index + t.length, 1)) !== -1 || text.substr(index + t.length, 1) == '')) {
                text = text.substr(0, index) + '#' + text.substr(index,1).toUpperCase() + text.substr(index + 1);
            }
        }
    }
    return text;
}

function askAuthor(user) {
    let btnCount = Math.ceil(user.allAuthors.length / 3);
    let btnData = [];

    for (let i = 0, j = 0; i < btnCount; i++) {
        btnData.push({
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "button",
                    "text": (i == 0) ? "Choisissez un auteur :" : "‎",
                    "buttons": []
                }
            }
        });
        for (j = 0; j < 3 && user.allAuthors[(i * 3) + j]; j++) {
            let buttons = btnData[i].attachment.payload.buttons;

            buttons.push({"type": "postback", "title": user.allAuthors[(i * 3) + j], "payload": (i * 3) + j});
        }
    }
    let index = 0;
    let indexLimit = btnData.length - 1;

    createBtn(user, btnData, index, indexLimit, createBtn);
}

function showPostInfo(user) {
    let showInfoText = [
        {text: rewardsInsightOk[getRandom(0, rewardsInsightOk.length)] + " Voici les informations de votre post :"},
        {text: user.title},
        {text: user.descLong},
        {
            attachment: {
                type: "image",
                payload: {
                    url: imageUrl + user.image
                }
            }
        }
    ];
    let index = 0;
    let indexLimit = showInfoText.length - 1;

    sendTextMessage(user, showInfoText, index, indexLimit, sendTextMessage);
}

function askTime(user) {
    const btnData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "button",
                "text": "Choisissez le moment de publication :",
                "buttons": [
                    {"type": "postback", "title": "Immédiatement", "payload": "now"},
                    {"type": "postback", "title": "Dans le tunnel de publication", "payload": "tunnel"},
                    {"type": "postback", "title": "Annulation", "payload": "stop"}
                ]
            }
        }
    };
    createBtn(user, btnData);
}

function posteriaRequest(uri, param, callback) {
    let url = kuratorUrl + uri;
    let headers = {
        'User-Agent': 'Chatbot',
        'Content-Type': 'application/x-www-form-urlencoded'
    };
    let option = {
        url: url,
        method: "POST",
        headers: headers,
        form: param
    };

    request(option, callback);
}

function sendTextMessage(user, msgData, index, indexLimit, callback) {
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: VERIFY_TOKEN},
        method: 'POST',
        json: {
            recipient: {id: user.sender},
            message: (index != undefined) ? msgData[index] : msgData
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending message: ', error);
        }
        else if (response.body.error) {
            console.log('[4]Error: ', response.body.error);
        }

        if (callback != undefined && index < indexLimit) {
            callback(user, msgData, index + 1, indexLimit, callback);
        }
        else if ((user.platform == 'wall' || user.author.length != 0) && index >= indexLimit) {
            askTime(user);
        }
    });
}

function createBtn(user, btnData, index, indexLimit, callback) {
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: VERIFY_TOKEN},
        method: 'POST',
        json: {
            recipient: {id: user.sender},
            message: (index != undefined) ? btnData[index] : btnData
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending message: ', error);
        }
        else if (response.body.error) {
            console.log('[4]Error: ', response.body.error);
        }

        if (callback != undefined && index < indexLimit) {
            callback(user, btnData, index + 1, indexLimit, callback);
        }
    });
}