import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    ScanCommand,
    PutCommand,
    GetCommand,
    DeleteCommand,
}
from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});

const tableName = "EMAIL_LOG";

export const handler = async (event) => {

    const records = event.Records;

    let responses = [];

    for (let i = 0; i < records.length; i++) {

        let record = records[i];
        let response = {
            statusCode: 200,
            message: ""
        };

        let message;

        try {
            message = JSON.parse(record.Sns.Message);
        }
        catch (error) {
            // Handle any errors that occur while parsing the JSON or accessing the value
            console.error(error);

            const logMessage = ` Notification Type ${message.notificationType}; ignoring writing to Database`
            console.log(logMessage);
            response.statusCode = 412;
            response.message = logMessage;

            response.statusCode = 500;
            responses.push(response);
            return;
        }

        if (message.notificationType === 'AmazonSnsSubscriptionSucceeded') {
            const logMessage = ` Notification Type ${message.notificationType}; ignoring writing to Database`
            console.log(logMessage);
            response.statusCode = 412;
            response.message = logMessage;

            responses.push(response);

            return;
        }

        const timestamp = new Date().getTime(); // get current timestamp in milliseconds
        const randomNum = Math.floor(Math.random() * 1000); // generate a random number between 0 and 999

        let primaryKey = `${timestamp}-${randomNum}`; // combine timestamp and random number to create the primary key

        const commonHeaders = message.mail.commonHeaders;

        console.log(primaryKey);
        console.log(message.notificationType)
        console.log(commonHeaders.from[0])
        console.log(commonHeaders.to[0])
        console.log(commonHeaders.subject)
        console.log(commonHeaders.date)

        // Set the parameters.
        let params = {
            TableName: tableName,
            Item: {
                Id: primaryKey,
                Email: commonHeaders.to[0],
                Status: message.notificationType,
                From: commonHeaders.from[0],
                Subject: commonHeaders.subject,
                Date: commonHeaders.date
            },
        };

        try {
            const dynamo = DynamoDBDocumentClient.from(client);
            var data = await dynamo.send(new PutCommand(params));
            
            console.info("Success:" + JSON.stringify(data, null, 2));
        }
        catch (err) {
            console.log(err);
            console.log(err.message);
            response.statusCode = 412;
            response.message = err.message;

            responses.push(response);

            return;
        }

        response.statusCode = 412;
        response.message = "Item Added";
        responses.push(response);
    }


    return responses;
};
