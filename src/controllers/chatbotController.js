require("dotenv").config();
const axios = require('axios');

const imgBlockGen = require('./genrators/imgBlockGen');
const webBtnBlockGen = require('./genrators/webBtnBlockGen');
const textBlockGen = require('./genrators/textBlockGen');
const payloadBtnBlockGen = require('./genrators/payloadBtnGen');
const groupedBtnBlockGen = require('./genrators/grroupedButtonBlockGen');



const request = require('request');

//services
const chatBotService = require('../services/chatBotService');


//emojis
const loveMojis = require('./keywords/loveMoji.js');


//greet
const greetWords = require('./keywords/greetWords');
const hiWords = require('./keywords/onlyHiWord');


//bhai
const bhaiWords = require('./keywords/bhaiBonWords');
const bhaiReplies = require('./keywords/replies/bhaiReply');

//reply words
const loveMojiReplies = require('./keywords/replies/lovemojiReply');
const greetReplies = require('./keywords/replies/greetingsReply');

//default reply
const defaultReply = require('./keywords/replies/defaultReply');
const getStartedMsg = require('./flows/botReplies/welcome/getStarted');



//keyword flows
const notesFlow = require('./flows/botReplies/noteFlow');
const level_1_notes = require('./flows/botReplies/note_levels/level_1/level_1_flow');
const level_2_notes = require('./flows/botReplies/note_levels/level_2/level_2_flow');
const level_3_notes = require('./flows/botReplies/note_levels/level_3/level_3_flow');
const level_4_notes = require('./flows/botReplies/note_levels/level_4/level_4_flow');



//help flow
const help_flow = require('./flows/helpFlow');




const MY_VERIFY_TOKEN = process.env.MY_VERIFY_TOKEN;

let testMsg = (req, res) => {
  return res.status(200).send(`Hello from notebot engine v1 ✔✔\n here are some routes - \n/profile\n/homepage`)
}

//get webhook
let getWebhook = (req, res) => {

  // Your verify token. Should be a random string.
  let VERIFY_TOKEN = MY_VERIFY_TOKEN;

  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  // Checks if a token and mode is in the query string of the request
  if (mode && token) {

    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {

      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);

    }
    else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
}


//post webhook
let postWebhook = (req, res) => {

  let body = req.body;

  // Checks this is an event from a page subscription
  if (body.object === 'page') {

    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function (entry) {

      // Gets the message. entry.messaging is an array, but 
      // will only ever contain one message, so we get index 0
      let webhook_event = entry.messaging[0];
      console.log(webhook_event);

      // Get the sender PSID
      let sender_psid = webhook_event.sender.id;
      console.log('👤Sender PSID: ' + sender_psid);

      // Check if the event is a message or postback and
      // pass the event to the appropriate handler function
      if (webhook_event.message && !webhook_event.message.is_echo) {
        handleMessage(sender_psid, webhook_event.message);
      } else if (webhook_event.postback) {
        handlePostback(sender_psid, webhook_event.postback);
      }
    });

    // Returns a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
  }
  else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

}



// Handles messages events
function handleMessage(sender_psid, received_message) {

  let response;

  //keywords
  const greets = greetWords;


  //emojis
  const loveMoji = loveMojis;
  const loveReply = loveMojiReplies;

  
  //handles if not txt. e.g: images, videos, voices etc
  if (!received_message.text) {
    response = defaultReply[0];
    callSendAPI(sender_psid, response);
  }
  
  else if (wordIncludes(greets, received_message)) {
    response = greetReplies[0];
    callSendAPI(sender_psid, response);
  }

  else if (wordIs(hiWords, received_message)) {
    response = greetReplies[0];
    callSendAPI(sender_psid, response);
  }


  //bhai
  else if (wordIncludes(bhaiWords, received_message)) {
    response = textBlockGen(`${randomPicker(bhaiReplies)}`);
    callSendAPI(sender_psid, response);
  }


  //API fetching example
  else if (wordIncludes(corona, received_message)) {
    axios.get('https://corona.lmao.ninja/v3/covid-19/countries/bangladesh').then(resp => {
      //console.log(`⚫ Total Cases: ${resp.data.cases}\n🔴 Total Deaths: ${resp.data.deaths}\n\n🔵 New Cases Today: ${resp.data.todayCases}\n🟠 Deaths Today: ${resp.data.todayDeaths}\n🟢 Recovered Today: ${resp.data.todayRecovered}`);
      response = textBlockGen(`⚫ Total Cases: ${resp.data.cases}\n🔴 Total Deaths: ${resp.data.deaths}\n\n🔵 New Cases Today: ${resp.data.todayCases}\n🟠 Deaths Today: ${resp.data.todayDeaths}\n🟢 Recovered Today: ${resp.data.todayRecovered}`)
      callSendAPI(sender_psid, response);
    }); 
  }


  //phone
  else if (wordIncludes(phoneWords, received_message)) {
    response = groupedBtnBlockGen(
      `🔰BUTEX PhoneBook - `,
      [
        webBtnBlockGen(`🌍 Visit Here`, `https://triptoafsin.github.io/BUTEX-PhoneBook/`)
      ]
    )
    callSendAPI(sender_psid, response);
  }

  //emoji
  else if (wordIncludes(loveMoji, received_message)) {
    // Create the payload for a basic text message
    response = {
      "text": `${randomPicker(loveReply)}`
    }
    callSendAPI(sender_psid, response);
  }


  //default reply
  else if (received_message.text) {
    response = defaultReply[0];

    callSendAPI(sender_psid, response);
  }
}




/*--------------------------------------------------------*/

// Handles messaging_postbacks events(button response)
let handlePostback = async (sender_psid, received_postback) => {

  let response;

  // Get the payload for the postback
  let payload = received_postback.payload;

  // Set the response based on the postback payload
  if (payload === 'GET_STARTED') {
    //getting username
    let username = await chatBotService.getFacebookUserInfo(sender_psid);

    console.log(`Username: ${username}`);
    response = getStartedMsg[0];
    callSendAPI(sender_psid, response);
  }


  else if (payload === 'notes_flow') {
    magicFunc(sender_psid, notesFlow);
  }

  else if (payload === 'level_1') {
    magicFunc(sender_psid, level_1_notes);
  }

  else if (payload === 'level_2') {
    magicFunc(sender_psid, level_2_notes);
  }
  else if (payload === 'level_3') {
    magicFunc(sender_psid, level_3_notes);
  }
  else if (payload === 'level_4') {
    magicFunc(sender_psid, level_4_notes);
  }


  //help
  else if (payload === 'help_payload') {
    magicFunc(sender_psid, help_flow);
  }
}


//magic func
let magicFunc = (sender_psid, flow) => {
  let i = 0;
  for (i = 0; i < flow.length; i++) {
    response = flow[i];
    callSendAPI(sender_psid, response);
  }
}

//wordDetectorFunctions
//word includes
let wordIncludes = (keywordArray, received_message) => {
  return keywordArray.some(word => received_message.text.toLowerCase().includes(word)); //received_message is an object
}

//payload include
let payloadIncludes = (keywordArray, payload) => {
  return keywordArray.some(word => payload.toLowerCase().includes(word));  //payload is a string
}

//word is
let wordIs = (keywordArray, received_message) => {
  return keywordArray.includes(received_message.text.toLowerCase());
}

//randomPicker Function
let randomPicker = (replyArray) => {
  return replyArray[Math.floor(Math.random() * replyArray.length)];
}






// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v7.0/me/messages",
    "qs": { "access_token": process.env.PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  });
}









module.exports = {
  testMsg: testMsg,
  getWebhook: getWebhook,
  postWebhook: postWebhook
}