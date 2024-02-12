function getGmailEmails() {
var threads = GmailApp.getInboxThreads(); 
for(var i = 0; i < threads.length; i++) {
        var messages = threads[1].getMessages(); 
        var msgCount = threads[1].getMessageCount(); 
    for (var j = 0; j <messages.length; j++){
        message = messages[j];
        if (message.isInInbox()){
            extractDetails(message, msgCount);
        }
    }
}
}
function extractDetails(message, msgCount) {
    var spreadsheetId='16571a9ANU5ZLRqK1d7CK1Rpnwc1WAK87WUU1HY65w18'; 
    var sheetname="mohit";
    var ss = SpreadsheetApp.openById(spreadsheetId);
    var timezone = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(); 
    var sheet = ss.getSheetByName(sheetname);
    const today = new Date();
var dateTime = Utilities.formatDate(message.getDate(), timezone, "dd-MM-yyyy"); 
    var subjectText = message.getSubject();
    var fromSend = message.getFrom();
    var toSend = message.getTo();
    var bodyContent = message.getPlainBody();
    sheet.appendRow([dateTime, msgCount, fromSend, toSend, subjectText, bodyContent]);
}
function onOpen(e) {
SpreadsheetApp.getUi()
.createMenu('Click to Fetch Mohit Sharma Emails')
.addItem('Get Email', 'getGmailEmails')
.addToUi();
}