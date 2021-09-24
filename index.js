'use strict';

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

const VERIFY_TOKEN = "EAAGCK9WZBPQoBAFtfBeE2c0AaEBZBXiDVx2QIURpDtlgm2aotslZApzOmyHpxo1w2tMTXGyPeAQ7id1BOoVxulnaivH4QN7aS5sj3p2Q8FUIobUQlZBODdkZADTZB4Xj1fBYqvChZCtdc6M77a82A619ZBea1dPmqFNJRYmKJ3YnQQZDZD";

const kuratorUrl = "https://preprod.kurator.fr",
      imageUrl = "http://image-kurator.fr/app",
      appUrl = "https://chatbot.posteria.fr/";

const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG, ENOTEMPTY } = require('constants');
const { response } = require('express');
const { fstat, stat } = require('fs');
const path = require('path');
const replyBotId = 1651592678499031;

const
    request = require('request'),
    express = require('express'),
    bodyParser = require('body-parser'),
    crypto = require('crypto'),
    validUrl = require('valid-url');

let app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({"extended": false}));

let port = (process.env.PORT || 5000);
app.set('port', port);
app.listen(port, () => console.log('WEBHOOK_OK'));
app.use(express.static("public"));

const getRandom = (min, max) => (Math.floor(Math.random() * ((max - min) + min)));
var allUsers = {};

class Step {

    constructor(name, eventType, stepFunction)
    {
        this.name = name;
        this.eventType = eventType;
        this.stepFunction = stepFunction;
    };

    setNextStepArray(nextStepArray) {
        this.nextStepArray = nextStepArray;
    };

    getNextStep(nextStepName) {

        for (let i = 0; i < this.nextStepArray.length; i++){
            if (this.nextStepArray[i].name === nextStepName){
                return (this.nextStepArray[i]);
            }
        }

        return null;
    };
}

function createStepTree()
{
    var step_checkLogged = new Step("checkLogged", ["message", "attachments", "postback"], checkLogged);
    var step_checkEvent = new Step("checkEvent", ["message", "attachments", "postback"], checkEvent);
    var step_actionFromMenu = new Step("actionFromMenu", ["message", "attachments", "postback"], actionFromMenu);
    var step_getSelectedCategory = new Step("getSelectedCategory", ["message", "attachments", "postback"], getSelectedCategory);
    var step_getDescLong = new Step("getDescLong", ["message", "attachments", "postback"], getDescLong);
    var step_getSelectedAuthor = new Step("getSelectedAuthor", ["message", "attachments", "postback"], getSelectedAuthor);
    var step_getSelectedTime = new Step("getSelectedTime", ["message", "attachments", "postback"], getSelectedTime);

    step_checkLogged.setNextStepArray([
        step_checkEvent
    ]);

    step_actionFromMenu.setNextStepArray([
        step_checkEvent
    ]);

    step_checkEvent.setNextStepArray([
        step_actionFromMenu,
        step_getSelectedCategory,
        step_getDescLong
    ]);

    step_getSelectedCategory.setNextStepArray([
        step_getDescLong,
        step_getSelectedCategory,
        step_getSelectedAuthor,
        step_getSelectedTime
    ]);

    step_getDescLong.setNextStepArray([
        step_getSelectedAuthor,
        step_getSelectedTime
    ]);

    step_getSelectedAuthor.setNextStepArray([
        step_getSelectedTime
    ]);

    return (step_checkLogged);
}

const stepsDetails = [
    {"event_type" : ["message", "attachments", "postback"], "function": checkLogged},
    {"event_type" : ["message", "attachments", "postback"], "function": actionFromMenu},
    {"event_type" : ["message", "attachments", "postback"], "function": checkEvent},
    {"event_type" : ["postback"], "function": getSelectedCategory},
    {"event_type" : ["message"], "function": getDescLong},
    {"event_type" : ["postback"], "function": getSelectedAuthor},
    {"event_type" : ["postback"], "function": getSelectedTime},
];

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

app.post('/proposeArticle/', (req, res) =>
{
    let responseStatus = 200;

    try {

        let body = req.body;
        let sender = body.sender;
        let content = body.bestContent.Content;
    
        createUser(sender);
        allUsers[sender].step = allUsers[sender].step.getNextStep('checkEvent');
        allUsers[sender].tmpContent = content;

        if (content.score == null) {
            content.score = 0;
        }
    
        createBtn(allUsers[sender], {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: [{
                        title: "[" + content.score + "/10] " + content.title,
                        image_url : kuratorUrl + content.image,
                        default_action: {
                            type: "web_url",
                            url: content.link
                        },
                        buttons: [{
                            type: "web_url",
                            url: content.link,
                            title: "Aller sur l'article"
                        },
                        {
                            type: "postback",
                            payload: "do_curation",
                            title: "En faire la Curation"
                        }]
                    }]
                }
            }
        });

    } catch(error){

        responseStatus = 400;
        console.log('[0]', error);
    }

    res.sendStatus(responseStatus);
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
        if (code != 1 || sender == null) {
            sendTextMessage(user, {text: 'Impossible de vous connecter à Posteria.'});
            return;
        }
    }

    user.isConnected = 1;
    user.step = user.step.getNextStep('checkEvent');

    user.step.stepFunction(user, user.firstMessage);
    user.firstMessage = "";

    let options = {
        root: path.join(__dirname)
    };

    res.sendFile('loginPosteria.html', options);
});

app.post('/webhook/', function (req, res)
{
    let responseStatus = 200;

    try {

        let messaging_events = req.body.entry[0].messaging;
    
        for (let i = 0; i < messaging_events.length; i++){

            let event = messaging_events[i];
            let sender = event.sender.id;

            if (sender == replyBotId){
                res.sendStatus(200);
                return;
            }

            if (!allUsers[sender]) {
                createUser(sender);
            }

            if (event.message && event.message.text && (event.message.text).toLowerCase() == 'reset'){
                delete allUsers[sender].step;
                allUsers[sender].step = createStepTree();
                console.log('User '+sender+' reseted');
                res.sendStatus(200);
                return;
            }

            if (allUsers[sender].step !== undefined){
                allUsers[sender].step.stepFunction(allUsers[sender], event);
            }
        }

    } catch(error) {
        console.log('[01]', error);
        responseStatus = 400;
    }

    res.sendStatus(responseStatus);
}); 

function createUser(sender)
{
    allUsers[sender] = {
        sender: sender,
        firstMessage : "",
        step: createStepTree(),
        currentPublicationProcess : '',
        isConnected: 0,
        fromMenu: 0,
        tmpContent: "",
        tmpContentSelected: 0,
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

function getEventType(event, user)
{
    if (event.postback && event.postback.payload) {
        return "postback";
    }

    if (event.message && event.message.text) {
        if (event.message.text == "reset") {
            delete allUsers[user.sender];
            return (null);
        }
        return "message";
    }

    if (event.message && event.message.attachments) {
        return "attachment";
    }

    return (null);
}

function goToStep(user, step, event, callFunction) {
    if (stepsDetails[step] !== undefined) {
        user.step = step;
        if (callFunction !== undefined && event !== undefined && callFunction) {
            stepsDetails[step].function(user, event);
        }
    }
}

function confirmArticle(user)
{
    let content = user.tmpContent;

    user.image = content.image;
    user.title = content.title;
    user.articleUrl = content.link;
    user.desc = content.description;
    user.tmpContentSelected = 1;

    posteriaRequest('/api/autoLogin', {extern_id: user.sender}, function(err, res, body) {

        let sender = null;

        try {

            body = JSON.parse(body);
            sender = parseInt(body.sender);

        } catch(error){
            console.log('PARSE ERROR [0]', error);
        }

        try {

            let isLogged = body.logged;

            if (body.hasError == true) {
                console.log('[02]', body.error);
                sendTextMessage(allUsers[sender], {text: "Une erreur s'est produite."});
                delete allUsers[sender];
                return;
            }

            if (isLogged) {
                allUsers[sender].step = allUsers[sender].step.getNextStep('checkEvent');
            }

        } catch (error) {
            console.log('[03]', error);
            sendTextMessage(allUsers[sender], {text: "Une erreur s'est produite."});
        }
    });
}

function showMenu(user, message) {

    if (typeof(message) == "undefined") {
        message = "";
    }

    createQuickReply(user, message + "Choisissez une action:", [
        {
            "content_type" : "text",
            "title" : "Faire une curation",
            "payload" : "menu_curation",
            "image_url" : ""
        },
        {
            "content_type" : "text",
            "title" : "Voir mes stats",
            "payload" : "menu_stat",
            "image_url" : ""
        },
        {
            "content_type" : "text",
            "title" : "Configuration",
            "payload" : "menu_config",
            "image_url" : ""
        }]
    );

    user.fromMenu = 0;
}

function checkLogged(user, event)
{
    posteriaRequest('/api/autoLogin', {extern_id: user.sender}, function(err, res, body) {

        let sender = null;

        try {

            body = JSON.parse(body);
            sender = parseInt(body.sender);

        } catch(error){
            console.log('PARSE ERROR [01]', error);
        }

        try {

            if (body.hasError == true) {
                sendTextMessage(allUsers[sender], {text: "Une erreur s'est produite."});
                delete allUsers[sender];
                console.log('[04]', body.error);
                return;
            }

            if (body.logged) {
                allUsers[sender].isConnected = 1;
                allUsers[sender].step = allUsers[sender].step.getNextStep('checkEvent');
                allUsers[sender].step.stepFunction(allUsers[sender], event);
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

            user.firstMessage = event;

            console.log('FIRST MESSAGE', user.firstMessage);

        } catch (x) {
            console.log('[05]', error);
            sendTextMessage(allUsers[sender], {text: "Une erreur s'est produite."});
        }
    });
}

function actionFromMenu(user, event)
{
    try {

        if (event.message === undefined ||
            event.message.quick_reply === undefined ||
            event.message.quick_reply.payload === undefined) {
            
            showMenu(user, "Je n'ai pas compris.");
            return;
        }

        switch (event.message.quick_reply.payload) {
            case "menu_curation":
                user.fromMenu = true;
                delete user.step;
                user.step = createStepTree();
                sendTextMessage(user, {text: "Parfait! Envoyez-nous un article dont vous souhaiter faire la curation."});
                break;
            case "menu_stat":
                showMenu(user, "Cette fonctionnalitée n'est pas encore disponible. ");
                break;
            case "menu_config":
                showMenu(user, "Cette fonctionnalitée n'est pas encore disponible. ");
                break;
            default:
                showMenu(user, "Je n'ai pas compris. ");
                break;
        }

    } catch(error){
        console.log('[06]', error);
    }
}

function checkEvent(user, event)
{
    let text = ''; 

    if (event.postback && event.postback.payload && event.postback.payload == 'do_curation') {
        confirmArticle(user);
        return;
    }
    else if (event.message && event.message.text) {
        text = event.message.text;
    }
    else if (event.message && event.message.attachments) {

        if (event.message.attachments[0].type === 'image'){ // MEDIA PUBLICATION

            user.image = event.message.attachments[0].payload.url;
            user.currentPublicationProcess = 'media';
            
            askLong(user);
            user.step = user.step.getNextStep('getDescLong');
            return;

        } else {

            let url = event.message.attachments[0].url;

            if (typeof(url) != 'undefined') {
                url = decodeURIComponent(url.split('u=')[1].split('&h=')[0]);
                text = url;
            }
        }
    }

    if (validUrl.isUri(text) == undefined) {
        if (!user.fromMenu) {
            showMenu(user);
            user.step = user.step.getNextStep('actionFromMenu');
        }
        return;
    }
 
    user.articleUrl = text;
    user.step = user.step.getNextStep('getSelectedCategory');
    user.currentPublicationProcess = 'article';

    let reqParam = {
        url: text,
        sender: user.sender
    };

    posteriaRequest("/api/getArticleInfo", reqParam, function(err, res, body) {

        let sender = null;

        try {

            body = JSON.parse(body);
            sender = parseInt(body.sender);

        } catch(error){
            console.log('PARSE ERROR [03]', error);
        }

        try {
           
            if (body.hasError == true || body.parseError == true) {
                if (body.error == "Cannot parse the article.") {
                    body.error = "Nous n\'avons pas pu récupérer l\'article \u{1F614} Nous manquons d\'informations";
                }
                sendTextMessage(allUsers[sender], {text: body.error});
                delete allUsers[sender];
                return;
            }

            allUsers[sender].image = body.image;
            allUsers[sender].title = body.title;
            allUsers[sender].desc = body.description;

            if (!allUsers[sender].allCategories.length){
                getCategoriesAndAuthors(allUsers[sender], askCategories);
            } else {
                askCategories(allUsers[sender]);
            }
        }
        catch (error) {
            console.log('[07]', error);
            sendTextMessage(user, {text: "Une erreur s'est produite."});
        }
    });
}

function getCategoriesAndAuthors(user, callback = null)
{
    posteriaRequest('/api/getCategoriesAndAuthors', {extern_id: user.sender}, function(err, res, body) {

        let sender = null;

        try {

            body = JSON.parse(body);
            sender = parseInt(body.sender);

        } catch(error){
            console.log('PARSE ERROR [04]', error);
        }
        
        try {

            allUsers[sender].platform = body.platform;
            allUsers[sender].tags = body.tags;

            if (body.categories) {
                for (const property in body.categories) {
                    allUsers[sender].allCategories.push(property);
                    allUsers[sender].allCategoriesId.push(body.categories[property]);
                }
            }

            if ((allUsers[sender].platform && allUsers[sender].platform == 'wordpress') && 
                (body.authors && body.authors.length)) {
                
                for (const property in body.authors) {
                    allUsers[sender].allAuthors.push(body.authors[property].username);
                    allUsers[sender].allAuthorsId.push(property);
                }
            }

            if (callback){
                callback(allUsers[sender]);
            }
        }
        catch (error) {
            console.log('[08]', error);
            sendTextMessage(allUsers[user.sender], {text: "Une erreur s'est produite. [2]"});
            return;
        }
    });
}

function askCategories(user)
{
    try {

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

    } catch(error){
        console.log('[09]', error);
    }
}

function getSelectedCategory(user, event)
{
    try {

        let payload = event.postback.payload;

        if (typeof(user.allCategoriesId[parseInt(payload, 10)]) == 'undefined') {
            return;
        }

        user.categorie = user.allCategoriesId[parseInt(payload, 10)];
        user.step = user.step.getNextStep('getDescLong');
        askLong(user);

    } catch(error){
        console.log('[10]', error);
    }
}

function askLong(user)
{
    try {

        const textDescLong = {text: rewardsCategoriesOk[getRandom(0, rewardsCategoriesOk.length)] + " Entrez votre description :"};
        sendTextMessage(user, textDescLong);

    } catch(error){
        console.log('[11]', error);
    }
}

function getDescLong(user, event)
{
    try {

        let message = event.message.text;

        if (!message || !message.length) {
            return;
        }
    
        user.descLong = hashtagify(user, message);

        if (user.currentPublicationProcess == 'article' && user.platform == 'wordpress') {
            askAuthor(user);
            user.step = user.step.getNextStep('getSelectedAuthor');
            return;
        }

        user.step = user.step.getNextStep('getSelectedTime');

        if (!user.tmpContentSelected) {
            showPostInfo(user);
            return;
        }

        askTime(user);

    } catch(error){
        console.log('[12]', error);
    }
}

function hashtagify(user, text)
{
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

function askAuthor(user)
{
    try {

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

    } catch(error){
        console.log('[13]', error);
    }
}

function showPostInfo(user)
{
    let informations = [
        {text: rewardsInsightOk[getRandom(0, rewardsInsightOk.length)] + " Voici les informations de votre post :"}
    ];

    if (user.title.length){
        informations.push({text: user.title});
    }

    
    if (user.descLong.length){
        informations.push({text: user.descLong});
    }
    
    if (user.image.length){
        informations.push({
            attachment: {
                type: "image",
                payload: {
                    url: kuratorUrl + user.image
                }
            }
        });
    }

    try {

        let index = 0;
        let indexLimit = informations.length - 1;
    
        sendTextMessage(user, informations, index, indexLimit, sendTextMessage);

    } catch(error){
        console.log('[14]', error);
    }
}

function askTime(user)
{
    try {

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

    } catch(error){
        console.log('[15]', error);
    }
}

function getSelectedAuthor(user, event)
{
    try {

        let payload = event.postback.payload;

        if (user.platform != 'wordpress' || typeof(user.allAuthorsId[parseInt(payload, 10)]) == "undefined") {
            return;
        }

        user.author = user.allAuthorsId[parseInt(payload, 10)];
        user.step = user.step.getNextStep('getSelectedTime');
        
        if (!user.tmpContentSelected) {
            showPostInfo(user);
            return;
        }
        askTime(user);

    } catch(error){
        console.log('[16]', error);
    }
}

function getSelectedTime(user, event)
{
    try {

        let payload = event.postback.payload;
        user.time = payload;

        if (user.time == 'stop') {
            sendTextMessage(user, {text: "Ok, la publication est annulée."});
            delete allUsers[user.sender];
            return;
        }

        let postInfos = {};
        let actionUrl = null;

        if (user.currentPublicationProcess == 'article'){

            postInfos = {
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

            actionUrl = 'addArticlesChatBot';

        } else if (user.currentPublicationProcess == 'media'){

            postInfos = {
                extern_id: user.sender,
                userDesc: user.descLong,
                image: user.image,
            };

            actionUrl = 'addMediasChatbot';
        }

        posteriaRequest('/api/'+actionUrl, postInfos, function(err, res, body) {

            let sender = null;

            try {

                body = JSON.parse(body);
                sender = parseInt(body.sender);
    
            } catch(error){
                console.log('PARSE ERROR [05]', error);
            }

            try {

                if (body.hasError == false) {
                    sendTextMessage(allUsers[sender], [{text: rewardsPublishOk[getRandom(0, rewardsPublishOk.length)]}], 0, 1, function() {
                        delete allUsers[sender].step;
                        allUsers[sender].step = createStepTree();
                    });
                    return; 
                }
                console.log('[17]', error);
                sendTextMessage(allUsers[sender], {text: body.error}); 
                delete allUsers[sender];
            }
            catch (error) {
                console.log('[18]', error);
                console.log("Une erreur s'est produite lors de l'enregistrement de l'article");
            } 
        });

    } catch(error){
        delete allUsers[user.sender];
    }
}

function posteriaRequest(uri, param, callback)
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
            console.log('[00] sendTextMessage', error);
        }
        else if (response.body.error) {
            console.log('[01] sendTextMessage', response.body.error);
            console.log('[01] msgData', msgData[index]);
        }

        if (callback != undefined && index < indexLimit) {
            callback(user, msgData, index + 1, indexLimit, callback);
        }
        else if ((user.platform == 'wall' || user.author.length != 0) && index >= indexLimit) {
            askTime(user);
        }
    });
}

function createQuickReply(user, message, quickReplies)
{
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: VERIFY_TOKEN},
        method: 'POST',
        json: {
            recipient: {id: user.sender},
            message: {
                "text" : message,
                "quick_replies" : quickReplies
            }
        }
    }, function(error, response, body) {
        if (error) {
            console.log('[00] Quick Replies', error);
        }
        else if (response.body.error) {
            console.log('[01] Quick Replies', response.body.error);
        }
    });
}

function createBtn(user, btnData, index, indexLimit, callback)
{
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
            console.log('[00] createBtn', error);
        }
        else if (response.body.error) {
            console.log('[01] createBtn', error);
        }

        if (callback != undefined && index < indexLimit) {
            callback(user, btnData, index + 1, indexLimit, callback);
        }
    });
}