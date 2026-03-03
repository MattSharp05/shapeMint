# Getting Started with the Xometry Developer API

This page will help you get started with the Xometry Developer API.

## What's available

* Accepted Jobs (Details, Part Files, etc)
* Job / Line Item Statuses (Materials Received, Production Started, Inspection Started, etc)
* Job Board Offers (currently limited to Partners that have been granted access [here](https://forms.gle/JPrtgTLmezf2Y62RA))

Requests / Feedback? Tell us what you'd like to see [here](https://forms.gle/w9JwLi3gkx8vmFJ19)

---

# Pushing Xometry Jobs to Manufacturing Systems

The Xometry Developer API offers webhooks and endpoints to enable partners to automatically import jobs to internal manufacturing systems as offers are accepted.

## Recommended Flow

1. Setup a webhook to receive notifications for when a job is created after an offer is accepted
2. Retrieve all job information including job attributes and dates
3. Retrieve files related to the job

---

# Setup a Webhook for Job Creation Events

## [How to create a webhook configuration for job creation?](https://developer.xometry.com/docs/creating-webhooks)

## [When the event is expected to be called?](https://developer.xometry.com/docs/webhook-events-payloads#job-created-trigger)

## [What data will be in the event](https://developer.xometry.com/docs/webhook-events-payloads#job-created-payload)

---

# Get Job Information

## Job

A job represents an accepted work order. It contains values for line items, media file, dates, and etc.

### Attributes

The following list shows attributes for a job and brief description for each:

> **guid** `string`\
> Globally unique identifier(guid) of a job. Guid can be used to retrieve a job.
>
> **id** `string`\
> Id of a job. Id can be used to retrieve a job.
>
> **status** `string`\
> Status of a job. Status can be on of the following: `incomplete`, `pending`, `progress`, `complete`, `error`.
>
> **lineItems** `array of objects`\
> List of line items associated to a job.
>
> > <details>
> >   <summary><i>Child Attributes</i></summary>
> >
> >   **guid** `string`\
> >   Guid of a job line item.
> >
> >   **quantity** `number`\
> >   Quantity of a job line item.
> >
> >   **dangerouslyProvidedAttributes** `array of objects`\
> >   Unstructured flexible manufacturing requirement documents. Values under this field can be changed without notice and are ***not reliable attribute for an automation***.
> >
> >   > <details>
> >   >   <summary><i>Child Attributes</i></summary>
> >   >
> >   >   **label** `string`\
> >   >   Label of the dangerously provided attribute.
> >   >
> >   >   **value** `string` or `array of strings`\
> >   >   Value of the dangerously provided attribute.
> >   > </details>
> >
> >   **attributes** `object`\
> >   Structured flexible manufacturing requirement documents. Values under this field remain unchanged once set.
> >
> >   **files** `object`\
> >   Media files associated to a job line item.
> >
> >   > <details>
> >   >   <summary><i>Child Attributes</i></summary>
> >   >
> >   >   **partFile** `array of objects`\
> >   >   Job line item part files data including href url, file type, original name, and preferred names.
> >   >
> >   >   > **href** `string`\
> >   >   > Url of file.
> >   >   >
> >   >   > **type** `string`\
> >   >   > Type of the file.
> >   >   >
> >   >   > **name** `string`\
> >   >   > Name of the uploaded file.
> >   >   >
> >   >   > **constructedName** `string`\
> >   >   > Preferred name of the file.
> >   >
> >   >   **printingStl** `array of objects`\
> >   >   Url for job line item part printing STL files.
> >   >
> >   >   **thumbnail** `array of objects`\
> >   >   Url for job line item part thumbnail files.
> >   >
> >   >   **traveler** `array of objects`\
> >   >   Url for job line item traveler reports.
> >   >
> >   >   **streamcacheConversion** `array of objects`\
> >   >   Url for job line item part stream cache files. // TO CHECK
> >   >
> >   >   **progressPhotos** `array of objects`\
> >   >   Url for job line item progress photos.
> >   >
> >   >   **redactedDrawings** `array of objects`\
> >   >   Url for job line item redacted drawings.
> >   >
> >   >   **requiredInspectionReports** `array of objects`\
> >   >   Url for job line item required inspection reports.
> >   >
> >   >   **submittedInspectionReports** `array of objects`\
> >   >   Url for job line item submitted inspection reports.
> >   >
> >   >   **requiredCertificationReports** `array of objects`\
> >   >   Url for job line item required certification reports.
> >   > </details>
> > </details>
>
> **dates** `object`\
> Dates relevant to a job. All dates are formatted in ISO 8601 standard.
>
> > <details>
> >   <summary><i>Child Attributes</i></summary>
> >
> >   **shipBy** `date`\
> >   Date a job needs to be shipped by.
> >
> >   **due** `date`\
> >   Date a job is due.
> >
> >   **submitted** `date`\
> >   Date a job is created or submitted.
> >
> >   **completed** `date`\
> >   Date a job is completed.
> > </details>
>
> **files** `object`\
> Media fields associated to a job.
>
> > <details>
> >   <summary><i>Child Attributes</i></summary>
> >
> >   **inventoryList** `string`\
> >   Url for a job inventory report.
> > </details>

---

# Retrieve Job Files

### Sample payload of job / job lineitem media

```json
{
  "thumbnail": [
    {
      "href": "https://api.developer.xometry.com/v0/jobs/{jobGuid}/line-items/{lineItemId}/thumbnail",
      "type": "image/png",
      "name": "xom2kzd_epd.png",
      "constructedName": null
    }
  ],
  "traveler": [
    {
      "href": "https://api.developerxometry.net/v0/jobs/62c85b40a24801001d329f21/line-items/62c8510c4185733f719f2ff2/traveler-report",
      "type": "application/pdf",
      "name": null,
      "constructedName": "0198537_traveler.pdf"
    }
  ]
}
```

### Job File Types

* inventory

### Job Line Item File Types

* part-file
* printing-stl
* thumbnail
* traveler-report
* stream-cache
* progress-photos
* redacted-drawings
* required-inspection-reports
* submitted-inspection-reports
* required-certification-reports

### How to retrieve files?

---

# Webhooks

Webhooks enable the delivery of notifications to an external web server whenever specific events take place in Workcenter

## About Webhooks

A webhook is a way for one system to send real-time data to another system as soon as a particular event occurs. Webhooks are typically used to automate the flow of data between different applications, services, or platforms over the internet.

## Types of Webhooks

1. [Job Created](https://developer.xometry.com/docs/webhook-events-payloads#job-created)
2. [Job Revised](https://developer.xometry.com/docs/webhook-events-payloads#job-revised)
3. [Job Status Updated](https://developer.xometry.com/docs/webhook-events-payloads#job-status-updated)

## Retry & Backoff Policy

* Our backoff policy allows for a maximum of 12 retries, each with exponentially increasing intervals. Retries begin at 1 minute, doubling with each attempt (2 minutes, 4 minutes, 8 minutes, and so on). If the webhook experiences 12 consecutive failures, it will be flagged as `broken` and will cease to receive further events until it is rectified and manually reactivated.

---

# Webhook Event & Payloads

## About Webhook Events

In the context of webhooks, event filtering refers to the ability to selectively trigger webhooks based on specific occurrences or actions within the source system. Rather than sending notifications for all possible events, developers can set up webhooks to respond only to certain predefined events that are relevant to their application. This filtering mechanism ensures that the receiving system is notified only about events it cares about, optimizing the use of resources and reducing unnecessary data processing

## Webhook Event Headers

* `X-Signature-SHA256`: Used to verify the webhook payload is from Xometry. The header is a generated hash signature of the requesting body with a timestamp using SHA-256.

## Events

### Job Created

#### Job Created Trigger

* On Xometry job acceptance or in-house job creation

#### Job Created Payload

```json
{
    "resource": "653aab43bb4aee00089de3e1",
    "resourceType": "job",
    "object": {
        "resource": "6555144a7134790007f8861e",
        "resourceType": "job",
        "object": {
            "id": "J0000000",
            "guid": "6555144a7134790007f8861e"
        }
    },
    "event": "job.created"
}
```

### Job Revised

#### Job Revised Trigger

* On update of the following fields: `xometry_vqc_required` `xometry_shipping`, `xometry_files` , `xometry_finalInspection`. Note: As a result of this revision event, other job details not listed in these fields may have also been updated.

#### Job Revised Payload

```json
{
    "resource": "653aab43bb4aee00089de3e1",
    "resourceType": "job",
    "object": {
        "resource": "6555144a7134790007f8861e",
        "resourceType": "job",
        "object": {
            "id": "J0000000",
            "guid": "6555144a7134790007f8861e",
          	"stageIds": ["xometry_shipping"],
        }
    },
    "event": "job.revised"
}
```

### Job Status Updated

#### Job Status Updated Trigger

* On update of a job status

#### Job Status Updated Payload

```json
{
  "resource": "65cd18881d5cf3000704ce55",
  "resourceType": "job",
  "object": {
    "id": "J0000000",
    "guid": "65cd18881d5cf3000704ce55",
    "orderStatus": {
      "from": "progress",
      "to": "error"
    }
  },
  "event": "job.statusUpdated"
}
```

---

# Configuring Webhooks

You can create webhooks that can be triggered on different events

## Creating a Webhook

1. In the upper-left hand corner of workcenter click your organization name to expand the sub navigation and click **Developer API**.

2. Navigate to the webhooks page by clicking the **Webhooks** link

3. Click **Create New Webhook**

4. Creating a Webhooks
   1. Select events that will trigger the Webhook
   2. Give the Webhook a name
   3. Enter url endpoint that will receive Webhook payload
   4. Click **Create Webhook**

## Editing a Webhook

1. Follow step 1-2 of [Creating a Webhook](https://developer.xometry.com/docs/configuring-webhooks#creating-a-webhook)
2. Click the Webhook to edit
3. Click **Edit Webhook**
4. Make any adjustments and click **Update Webhook**

## Viewing & Replaying Webhook Events

1. Follow step 1-2 of [Editing a Webhook](https://developer.xometry.com/docs/configuring-webhooks#editing-a-webhook)
2. Click on an event to inspect or replay
