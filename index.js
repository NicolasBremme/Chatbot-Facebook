'use strict';

const VERIFY_TOKEN = "EAAGCK9WZBPQoBAFtfBeE2c0AaEBZBXiDVx2QIURpDtlgm2aotslZApzOmyHpxo1w2tMTXGyPeAQ7id1BOoVxulnaivH4QN7aS5sj3p2Q8FUIobUQlZBODdkZADTZB4Xj1fBYqvChZCtdc6M77a82A619ZBea1dPmqFNJRYmKJ3YnQQZDZD",
    appUrl = "https://test--chatbot.herokuapp.com",
    pathToFiles = "/app/";
const kuratorUrl = "https://app.posteria.fr",
    imageUrl = "http://image-kurator.fr/app";
const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require('constants');
const { response } = require('express');
const { fstat } = require('fs');
const { parse } = require('path');
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

let allUsers = {};

app.post('/webhook/', function (req, res)
{
    console.log("WEBHOOK_EVENT_RECEIVED");
    let messaging_events = req.body.entry[0].messaging;
    for (let i = 0; i < messaging_events.length; i++) {
        let event = messaging_events[i];
        let sender = event.sender.id;

        if (undefined === allUsers[sender]) {
            allUsers[sender] = {
                sender: sender,
                urlEntered: 0,
                isConnected: 0,
                articleUrl: "",
                platform: "",
                allCategories: [],
                allCategoriesId: [],
                allAuthors: [],
                allAuthorsId: [],
                categories: [],
                categoriesSelected: 0,
                descLong: "",
                author: "",
                title: "",
                image: "",
                desc: "",
                time: "",
            };
        }

        if (event.message && event.message.quick_reply) {
            doPostback(allUsers[sender], event);
        }
        else if (event.message && event.message.text) {
            doMessage(allUsers[sender], event);
        }
        else if (event.message && event.message.attachments) {
            let url = event.message.attachments[0].url

            if(typeof url != 'undefined'){
                url = decodeURIComponent(url.split('u=')[1].split('&h=')[0]);
                event.message.text = url;
                doMessage(allUsers[sender], event);
            }
            else{
                console.log('attachment is an image');
            }
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
            delete allUsers[sender];
        }
    }
    else {
        return;
    }
    res.sendFile(pathToFiles + 'loginPosteria.html');
});

function getCategoriesAndAuthors(user) {
    user.isConnected = 1;
    kuratorRequest('/api/getCategoriesAndAuthors', {extern_id: user.sender}, function(err, res, body) {
        try {
            body = JSON.parse(body);
            let sender = parseInt(body.sender);
            
            allUsers[sender].platform = body.platform;

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
            QR_askCategories(allUsers[sender], 1);
        }
        catch (error) {
            console.log('[1] ' + error);
            sendTextMessage(allUsers[sender], {text: "Une erreur s'est produite."});
            delete allUsers[sender];
            return;
        }
    });
}

function doMessage(user, event)
{
    let message = event.message.text;

    if (message == 'reset') {
        delete allUsers[user.sender];
        return;
    }
    if (user.urlEntered == 0) {
        if (message.search(kuratorUrl) == -1) {
            checkURL(user, message);
        }
        return;
    }
    if (user.categoriesSelected == 1 && user.descLong.length == 0) {
        user.descLong = message;
        if (user.platform == 'wordpress') {
            QR_askAuthor(user);
        } else {
            showPostInfo(user);
        }
        return;
    }
}

function doPostback(user, event)
{
    let payload = event.message.quick_reply.payload;

    if (user.categoriesSelected == 0) {
        if (payload == "send" && user.categories.length != 0) {
            user.categoriesSelected = 1;
            askLong(user);
            return;
        }
        else if (payload != "send") {
            let newCategorie = 1;

            for (let i = 0; i < user.categories.length; i++) {
                if (user.categories[i] == payload) {
                    newCategorie = 0;
                    break;
                }
            }
            if (newCategorie == 1) {
                user.categories.push(user.allCategoriesId[parseInt(payload)]);
            }
            QR_askCategories(user, 0);
            return;
        }
        else {
            QR_askCategories(user, 2);
            return;
        }
    }
    if (user.platform == 'wordpress' && user.author.length == 0) {
        user.author = user.allAuthorsId[parseInt(payload)];
        showPostInfo(user);
        return;
    }
    if (user.time.length == 0) {
        user.time = payload;
        if (user.time == "stop") {
            sendTextMessage(user, {text: "Ok, la publication est annulée."});
            delete allUsers[user.sender];
        }
        else {
            let postInfos = {
                extern_id: user.sender,
                title: user.title,
                description: user.desc,
                image: user.image,
                link: user.articleUrl,
                categories: user.categories,
                author: user.author,
                userDesc: user.descLong,
                time: user.time
            };
            kuratorRequest('/api/addArticlesChatBot', postInfos, function(err, res, body) {
                try {
                    body = JSON.parse(body);
                    let sender = parseInt(body.sender);

                    if (body.hasError == false) {
                        sendTextMessage(allUsers[sender], {text: rewardsPublishOk[getRandom(0, rewardsPublishOk.length)]});
                        delete allUsers[sender];
                        return;
                    } else {
            		    sendTextMessage(allUsers[sender], {text: body.error});
                        delete allUsers[sender];
                        return;
                    }
                }
                catch (error) {
                    console.log('[2] ' + error);
                    console.log("Une erreur s'est produite lors de l'enregistrement de l'article");
                    delete allUsers[sender];
                    return;
            	}
            });
        }
        return;
    }
}

function QR_askTime(user)
{
    const btnData = {
        "text": "Choisissez un moment du publication :",
        "quick_replies": [
            {"content_type": "text", "title": "Immédiatement", "payload": "now"},
            {"content_type": "text", "title": "Dans le tunnel de publication", "payload": "tunnel"},
            {"content_type": "text", "title": "Annulation", "payload": "stop"}
        ]
    };
    sendTextMessage(user, btnData);
}

function showPostInfo(user)
{
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

function QR_askAuthor(user)
{
    let btnData = {
        "text": "Choisissez un auteur :",
        "quick_replies": []
    };
    let buttons = btnData.quick_replies;

    for (let j = 0; j < 13 && user.allAuthors[j]; j++) {
        buttons.push({"content_type": "text", "title": user.allAuthors[j], "payload": j});
    }
    sendTextMessage(user, btnData);
}

function askLong(user)
{
    const textDescLong = {text: rewardsCategoriesOk[getRandom(0, rewardsCategoriesOk.length)] + " Entrez votre description :"};

    sendTextMessage(user, textDescLong);
}

function QR_askCategories(user, mode)
{
    let btnData = {
        "text": "",
        "quick_replies": []
    };
    let buttons = btnData.quick_replies;

    if (mode == 0) {
        btnData.text = "Ensuite ?";
    }
    else if (mode == 1) {
        btnData.text = "Choisissez une ou plusieurs catégorie(s) et appuyez sur Send :";
    }
    else if (mode == 2) {
        btnData.text = "Vous devez sélectionner au moins 1 catégorie.";
    }

    for (let j = 0; j < 12 && user.allCategories[j]; j++) {
        buttons.push({"content_type": "text", "title": user.allCategories[j], "payload": j});
    }
    buttons.push({"content_type": "text", "title": "Send", "payload": "send"});
    sendTextMessage(user, btnData);
}

function kuratorRequest(uri, param, callback)
{
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

function checkURL(user, text)
{
    let reqParam = {
        url: text,
        sender: user.sender
    };

    console.log("Message: " + text);
    if (user.urlEntered == 0 && validUrl.isUri(text)){
        console.log('Looks like an URI');
        user.urlEntered = 1;
        user.articleUrl = text;

        kuratorRequest("/api/getArticleInfo", reqParam, function(err, res, body) {
            try {
                body = JSON.parse(body);
                let sender = parseInt(body.sender);

                if (body.hasError == false && body.parseError == false) {
                    allUsers[sender].image = body.image;
                    allUsers[sender].title = body.title;
                    allUsers[sender].desc = body.description;
                    kuratorRequest('/users/login', {extern_id: sender, autologin: 1}, function(err, res, body) {
                        try {
                            body = JSON.parse(body);
                            let sender = parseInt(body.sender, 10);
                            let code = parseInt(body.code, 10);

                            if (code == 1 && sender != null) {
                                getCategoriesAndAuthors(allUsers[sender]);
                            }
                            else if (code == 2 && sender != null) {
                                sendTextMessage(allUsers[sender], [
                                    {attachment: {type: "image", payload: {url: kuratorUrl + "/img/posteria/kurator_no_gbest-publication.jpg"}}},
                                    {text: kuratorUrl + '?extern_id=' + sender}
                                ], 0, 1, sendTextMessage);
                            }
                            else {
                                sendTextMessage(user, {text: 'Impossible de vous connecter à Kurator.'});
                                delete allUsers[sender];
                            }
                        }
                        catch (error) {
                            console.log('[4] ' + error);
                            sendTextMessage(allUsers[sender], {text: "Une erreur s'est produite."});
                            delete allUsers[sender];
                            return;
                        }
                    });
                }
                else {
                    if(body.error == 'Cannot parse the article.') {
                        sendTextMessage(allUsers[sender], {text: 'Nous n\'avons pas pu récupérer l\'article \u{1F614} Nous manquons d\'informations'});
                    }
                    else {
                        sendTextMessage(allUsers[sender], {text: body.error});
                    }
                    delete allUsers[sender];
                }
            }
            catch (error) {
                console.log('[3] ' + error);
                sendTextMessage(allUsers[sender], {text: "Une erreur s'est produite."});
                delete allUsers[sender];
                return;
            }
        });
    } else {
        console.log('Not an URI');
    }
}

function sendTextMessage(user, msgData, index, indexLimit, callback)
{
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
        else if ((user.platform == 'wall' || user.author.length != 0) && user.time.length == 0 && index >= indexLimit) {
            QR_askTime(user);
        }
    });
}