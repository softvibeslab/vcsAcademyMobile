# User Flows

Version: 1.0  
Date: 2026-04-29

## 1. Rep First-Run Flow

```mermaid
flowchart TD
  A["Open App"] --> B["Welcome / Onboarding"]
  B --> C["Smart Agent Introduction"]
  C --> D{"Authenticated?"}
  D -->|"No"| E["Login / Account Access"]
  D -->|"Yes"| F["Home Dashboard"]
  E --> F
  F --> G["Smart Agent Card"]
  F --> H["Quick Access"]
```

Acceptance:

- User understands AI coaching value before entering the app.
- Returning user can skip marketing-style onboarding if session exists.

## 2. Daily Rep Flow

```mermaid
flowchart TD
  A["Home Dashboard"] --> B["Check Today's Progress"]
  B --> C{"Need coaching?"}
  C -->|"Yes"| D["Ask Smart Agent"]
  C -->|"No"| E["Open Roadmap or GoalSheet"]
  D --> F["Recommended Next Action"]
  F --> G{"Action Type"}
  G -->|"Train"| H["Blueprint Step Detail"]
  G -->|"Practice"| I["Roleplay Live"]
  G -->|"Log"| J["Smart GoalSheet"]
```

## 3. Roadmap Training Flow

```mermaid
flowchart TD
  A["Roadmap"] --> B["Current Stage Card"]
  B --> C["11-Step Blueprint List"]
  C --> D{"Select Step"}
  D -->|"Completed"| E["Review Step"]
  D -->|"Current"| F["Continue with Agent"]
  D -->|"Locked"| G["See Preview or Locked State"]
  F --> H["Step Detail"]
  H --> I["Watch / Script / Audio"]
  I --> J["Run Step"]
  J --> K["Roleplay Live"]
```

Rules:

- Locked states should not block informational previews unless business policy requires full lock.
- Current step action should prioritize coaching.

## 4. Step 5 Practice Flow

```mermaid
flowchart TD
  A["Step Detail: Break & Remake the Pact"] --> B["Watch Training"]
  A --> C["Review Practice Script"]
  A --> D["Listen to Audio Delivery"]
  A --> E["Read Context and Compliance Note"]
  B --> F["Run Step"]
  C --> F
  D --> F
  E --> F
  F --> G["Roleplay Live: Objection Handling"]
  G --> H["AI Feedback or Manager Submission"]
```

Compliance:

- This flow trains professional commitment setting.
- The app must not frame the step as pressure, manipulation, or misleading urgency.

## 5. Roleplay Live Flow

```mermaid
flowchart TD
  A["Launch Roleplay"] --> B["Scenario Card"]
  B --> C["Coach and Rep Tiles"]
  C --> D["Practice Conversation"]
  D --> E{"Session Complete?"}
  E -->|"No"| D
  E -->|"Yes"| F["Generate Summary"]
  F --> G["Score Against Rubric"]
  G --> H{"Manager Review Required?"}
  H -->|"Yes"| I["Create Submission"]
  H -->|"No"| J["Save Practice Result"]
```

## 6. Smart GoalSheet Flow

```mermaid
flowchart TD
  A["Open GoalSheet"] --> B["Select Date"]
  B --> C["Select Tour Outcome"]
  C --> D["Select Sales Outcome"]
  D --> E{"Sold?"}
  E -->|"Yes"| F["Enter Sales Volume and Count"]
  E -->|"No"| G["Select No-Sale Reason"]
  F --> H["Add Manager / T.O. Optional"]
  G --> H
  H --> I["Add Follow-Ups"]
  I --> J["Add Optional Note"]
  J --> K["Calculate Metrics"]
  K --> L["Smart Agent Insight"]
  L --> M["Save Entry"]
```

Validation:

- Sales volume must be non-negative numeric.
- If no sale, reason should be prompted.
- Entry date must not create duplicate entries unless edit mode is active.

## 7. Trainer Review Flow

```mermaid
flowchart TD
  A["Trainer Dashboard"] --> B["Pending Roleplay Reviews"]
  B --> C["Open Submission"]
  C --> D["Review Content"]
  D --> E["Score Rubric"]
  E --> F["Write Feedback"]
  F --> G["Submit Review"]
  G --> H["Rep Notification"]
  G --> I["Progress Updated"]
```

## 8. Certification Flow

```mermaid
flowchart TD
  A["Certification Dashboard"] --> B["Check Requirements"]
  B --> C{"All Requirements Complete?"}
  C -->|"No"| D["Show Missing Items"]
  C -->|"Yes"| E["Manager Review"]
  E --> F{"Approve?"}
  F -->|"Yes"| G["Issue Certification"]
  F -->|"No"| H["Return Feedback and Practice Plan"]
```

## 9. Sensitive Resource Access Flow

```mermaid
flowchart TD
  A["Open Resource"] --> B["Server Permission Check"]
  B --> C{"Authorized?"}
  C -->|"No"| D["Access Denied"]
  C -->|"Yes"| E["Create Access Log"]
  E --> F["Display Resource"]
```

## 10. Admin Content Flow

```mermaid
flowchart TD
  A["Admin Dashboard"] --> B["Create/Edit Content"]
  B --> C["Assign Blueprint Step"]
  C --> D["Set Content Type"]
  D --> E["Set Sensitivity"]
  E --> F{"Publish?"}
  F -->|"Draft"| G["Save Draft"]
  F -->|"Publish"| H["Validate Required Metadata"]
  H --> I["Publish to Eligible Users"]
```

