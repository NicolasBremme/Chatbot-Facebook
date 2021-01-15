'use strict';

const VERIFY_TOKEN = "EAAGCK9WZBPQoBAFtfBeE2c0AaEBZBXiDVx2QIURpDtlgm2aotslZApzOmyHpxo1w2tMTXGyPeAQ7id1BOoVxulnaivH4QN7aS5sj3p2Q8FUIobUQlZBODdkZADTZB4Xj1fBYqvChZCtdc6M77a82A619ZBea1dPmqFNJRYmKJ3YnQQZDZD",
    appUrl = "https://test--chatbot.herokuapp.com";
// const kuratorUrl = "https://app.posteria.fr",
const kuratorUrl = "https://preprod.kurator.fr/",
    imageUrl = "http://image-kurator.fr/app";
const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require('constants');
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

//Quand le tweet est bon
var rewardsUrlOk = [
    "Génial ce tweet ! \u{1F609}",
    "Super tweet ! \u{1F929}",
    "Beau travail !  \u{1F642}",
	"Well done ! \u{1F917}",
	"Very well \u{1F618}",
	"Very good \u{1F44D}",
	"Bravo \u{1F44F}",
	"Tweet validé \u{1F642}",
	"Good work \u{1F44A}",
	"Tweet ok \u{1F3FE}",
	"Ton tweet est excellent \u{1F60E}",
	"Géniiiiial !!!!! \u{1F60D}",
	"Bon boulot !!! \u{1F601}"
];

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
    
        if (event.message && event.message.text) {
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
        else if (event.postback && event.postback.payload) {
            doPostback(allUsers[sender], event);
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
    res.sendStatus(200);
    if (user != null && user.isConnected == 0) {
        if (code == 1 && sender != null) {
            user.isConnected = 1;
            kuratorRequest('/api/getCategoriesAndAuthors', {extern_id: user.sender}, function(err, res, body) {
                try {
                    console.log('before json parse.');
                    body = JSON.parse(body);
                    let sender = parseInt(body.sender);
                    
                    console.log('before set platform.');
                    allUsers[sender].platform = body.platform;
                    console.log('before cat.');
                    for (const property in body.categories) {
                        allUsers[sender].allCategories.push(property);
                        allUsers[sender].allCategoriesId.push(body.categories[property]);
                    }
                    
                    console.log('before WP.');
                    if (allUsers[sender].platform == 'wordpress') {
                        for (const property in body.authors) {
                            allUsers[sender].allAuthors.push(body.authors[property].username);
                            allUsers[sender].allAuthorsId.push(property);
                        }
                    }
                    console.log('before QR.');
                    QR_askCategories(allUsers[sender]);
                    console.log('after QR.');
                }
                catch {
                    sendTextMessage(allUsers[sender], {text: "Une erreur s'est produite. [2]"});
                    delete allUsers[sender];
                    return;
                }
            });
        } else {
            sendTextMessage(user, {text: 'Impossible de vous connecter à Kurator.'});
            delete allUsers[sender];
        }
    } else {
        return;
    }
});

function doMessage(user, event)
{
    let message = event.message.text;

    if (message == 'reset') {
        delete allUsers[user.sender];
        return;
    }
    if (user.urlEntered == 0) {
        checkURL(user, message);
        //user.skip = 1;
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
    let payload = event.postback.payload;

    if (user.categoriesSelected == 0) {
        if (payload == "send" && user.categories.length != 0) {
            user.categoriesSelected = 1;
            askLong(user);
            return;
        }
        else {
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
                } catch {
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
        "text": "Choisissez un auteur :",
        "quick_replies": [{
            "text": "Choisissez le moment de publication :",
            "buttons": [
                {"content_type": "text", "title": "Immédiatement", "payload": "now"},
                {"content_type": "text", "title": "Dans le tunnel de publication", "payload": "tunnel"},
                {"content_type": "text", "title": "Annulation", "payload": "stop"}
            ]
        }]
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
    let btnCount = Math.ceil(user.allAuthors.length / 3);
    let btnData = [];

    for (let i = 0, j = 0; i < btnCount; i++) {
        btnData.push({
            "text": "Choisissez un auteur :",
            "quick_replies": []
        });
        for (j = 0; j < 3 && user.allAuthors[(i * 3) + j]; j++) {
            let buttons = btnData[i].quick_replies;

            buttons.push({"content_type": "text", "title": user.allAuthors[(i * 3) + j], "payload": (i * 3) + j});
        }
    }
    let index = 0;
    let indexLimit = btnData.length - 1;

    sendTextMessage(user, btnData, index, indexLimit, sendTextMessage);
}

function askLong(user)
{
    const textDescLong = {text: rewardsCategoriesOk[getRandom(0, rewardsCategoriesOk.length)] + " Entrez votre description :"};

    //user.skip = 1;
    sendTextMessage(user, textDescLong);
}

function QR_askCategories(user)
{
    let btnCount = Math.ceil(user.allCategories.length / 3);
    let btnData = [];

    for (let i = 0, j = 0; i < btnCount; i++) {
        btnData.push({
            "text": "Choisissez une ou plusieurs catégorie(s) :",
            "quick_replies": []
        });
        for (j = 0; j < 3 && user.allCategories[(i * 3) + j]; j++) {
            let buttons = btnData[i].payload.buttons;

            buttons.push({"content_type": "text", "title": user.allCategories[(i * 3) + j], "payload": (i * 3) + j});
        }
    }
    let index = 0;
    let indexLimit = btnData.length;

    btnData.push({
        "text": "Quand vous avez sélectionné toute les catégories, appuyez sur le bouton \"send\":",
        "quick_replies": [
            {"content_type": "text", "title": Send, "payload": "send"}
        ]
    });
    createBtn(user, btnData, index, indexLimit, createBtn);
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
                    sendTextMessage(allUsers[sender], {text: kuratorUrl + '?extern_id=' + sender});
                }
                else {
                    if(body.error == 'Cannot parse the article.') {
                        sendTextMessage(allUsers[sender], {text: 'Nous n\'avons pas pu récupérer l\'article \u{1F614} Nous manquons d\'informations'});
                    } else {
                        sendTextMessage(allUsers[sender], {text: body.error});
                    }
                    delete allUsers[sender];
                }
            } catch {
                sendTextMessage(allUsers[sender], {text: "Une erreur s'est produite. [1]"});
                delete allUsers[sender];
                return;
            }
        });
    } else {
        console.log('Not an URI');
    }
}

function createBtn(user, btnData, index, indexLimit, callback)
{
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: VERIFY_TOKEN},
        method: 'POST',
        json: {
            recipient: {id: user.sender},
            message: {attachment: (index != undefined) ? btnData[index] : btnData}
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error creating button: ', error);
        }
        else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
        if (callback != undefined && index < indexLimit) {
            callback(user, btnData, index + 1, indexLimit, callback);
        }
    });
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
            console.log('Error: ', response.body.error);
        }
        if (callback != undefined && index < indexLimit) {
            callback(user, msgData, index + 1, indexLimit, callback);
        }
        else if ((user.platform == 'wall' || user.author.length != 0) && user.time.length == 0 && index >= indexLimit) {
            QR_askTime(user);
        }
    });
}