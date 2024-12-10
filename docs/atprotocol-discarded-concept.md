# AT Protocol Integration Design

This document outlines how Rayleigh integrates with the AT Protocol for community management.

## Core Entities

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'lineColor': '#000000', 'primaryColor': '#000000', 'primaryBorderColor': '#000000', 'backgroundColor': '#ffffff', 'actorBkg': '#ffffff', 'actorTextColor': '#000000' }}}%%
erDiagram
    Community ||--o{ CommunityMember : has
    Community ||--o{ Post : contains
    Community {
        string uri PK
        string cid
        string name
        string description
        string tag
        timestamp created_at
        enum visibility
        jsonb rules
        string creator_did FK
    }
    CommunityMember {
        string community_uri FK
        string member_did PK
        string handle
        string display_name
        enum role
        timestamp joined_at
        boolean is_active
    }
    Post ||--o{ Reply : has
    Post {
        string uri PK
        string cid
        string author_did FK
        string community_uri FK
        timestamp created_at
        string content
        boolean is_deleted
    }
    Reply {
        string uri PK
        string parent_uri FK
        string root_uri FK
        string author_did FK
        timestamp created_at
        string content
        boolean is_deleted
    }
    Moderation ||--o{ Community : manages
    Moderation {
        string id PK
        string community_uri FK
        string moderator_did FK
        string target_did FK
        enum action_type
        timestamp created_at
        string reason
        timestamp expires_at
    }
```

## Core Flows

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'lineColor': '#000000', 'primaryColor': '#000000', 'primaryBorderColor': '#000000', 'backgroundColor': '#ffffff', 'noteTextColor': '#000000', 'actorBkg': '#ffffff', 'actorTextColor': '#000000', 'actorLineColor': '#000000' }}}%%
sequenceDiagram
    participant Client
    participant Server
    participant AT Protocol
    participant PostgreSQL
    
    %% Community Creation Flow
    rect rgb(255, 255, 255)
        note over Client,PostgreSQL: Community Creation
        Client->>+Server: createCommunity(name, desc, tag)
        Server->>+AT Protocol: createRecord(type: app.rayleigh.community)
        AT Protocol-->>-Server: Return community URI & CID
        Server->>+PostgreSQL: Insert community record
        Server->>PostgreSQL: Add creator as admin member
        Server-->>-Client: Return community data
    end

    %% Post Creation Flow
    rect rgb(255, 255, 255)
        note over Client,PostgreSQL: Post Creation
        Client->>+Server: createPost(communityUri, content)
        Server->>+PostgreSQL: Verify user is community member
        Server->>+AT Protocol: createRecord(type: app.bsky.feed.post)
        AT Protocol-->>-Server: Return post URI & CID
        Server->>PostgreSQL: Insert post record
        Server-->>-Client: Return post data
    end

    %% Member Management Flow
    rect rgb(255, 255, 255)
        note over Client,PostgreSQL: Member Management
        Client->>+Server: joinCommunity(communityUri)
        Server->>+PostgreSQL: Verify community exists
        Server->>+AT Protocol: createRecord(type: app.rayleigh.membership)
        AT Protocol-->>-Server: Return membership URI & CID
        Server->>PostgreSQL: Insert member record
        Server-->>-Client: Return membership status
    end

    %% Moderation Flow
    rect rgb(255, 255, 255)
        note over Client,PostgreSQL: Moderation Action
        Client->>+Server: moderateUser(communityUri, targetDid, action)
        Server->>+PostgreSQL: Verify moderator permissions
        Server->>PostgreSQL: Create moderation record
        Server->>AT Protocol: Update threadgate if needed
        Server-->>-Client: Return moderation status
    end
```

```mermaid
sequenceDiagram
    participant User A
    participant User B
    participant Bluesky
    participant Our Server

    %% Community Creation
    User A->>Bluesky: Creates post: "New community: Programming Tips #rayleigh"
    Bluesky-->>User A: Returns post URI
    User A->>Our Server: POST /communities
    Note right of Our Server: Stores:{<br/>- community_id<br/>- owner_did (User A)<br/>- post_uri<br/>- metadata}

    %% User B Discovers & Joins
    User B->>Bluesky: Sees post via hashtag/feed
    User B->>Our Server: POST /communities/{id}/join
    Note right of Our Server: Stores:{<br/>- member_did (User B)<br/>- community_id<br/>- role: pending}
    
    %% Owner Approval
    User A->>Our Server: GET /communities/{id}/pending
    Our Server-->>User A: List of pending members
    User A->>Our Server: POST /communities/{id}/approve
    Note right of Our Server: Updates:<br/>role: member

```
## Key Concepts

1. **Communities**
   - Stored as AT Protocol records with type `app.rayleigh.community`
   - Core metadata in PostgreSQL for efficient querying
   - Rules and settings stored in JSONB for flexibility

2. **Membership**
   - Tracks community roles (member, moderator, admin)
   - Uses AT Protocol records for decentralized verification
   - PostgreSQL for fast member lookups and role checks

3. **Posts**
   - Leverages AT Protocol's native post system
   - Community association through custom fields
   - Local copy in PostgreSQL for community-specific queries

4. **Moderation**
   - Combines AT Protocol threadgate with local moderation records
   - Supports temporary and permanent actions
   - Audit trail in PostgreSQL

## Implementation Notes

1. **AT Protocol Records**
   - Communities and memberships are stored as AT Protocol records
   - Posts use standard Bluesky post format with community metadata
   - Custom lexicon defines community-specific fields

2. **PostgreSQL Usage**
   - Primary source for community metadata and relationships
   - Caches AT Protocol data for performance
   - Handles member roles and moderation actions

3. **Synchronization**
   - Firehose subscription keeps PostgreSQL in sync with AT Protocol
   - Background jobs handle temporary moderation expiry
   - Periodic validation ensures data consistency
