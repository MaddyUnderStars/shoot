# Unnamed Activitypub real time chat server

# Requirements

## Users

-   [ ] Can register, which may require
-   -   [ ] Captcha
-   -   [ ] Email verification
-   -   [ ] Manual approval
-   [ ] Can login, which may require:
-   -   [ ] A 2fa code from an authenticator app
-   [ ] Can delete own accounts
-   [ ] Can send messages
-   [ ] Can send DM messages to users
-   -   [ ] A pair of users can create a single DM channel between them
-   [ ] Can send messages to group DMs between multiple users
-   -   [ ] Any existing group chat with the same combination of users should be shown to the creator before a new one is made
-   [ ] Can join guilds
-   [ ] Can create guilds
-   [ ] For guilds they own/have permission in:
-   -   [ ] Can create channels in guilds
-   -   [ ] Can create roles in guilds
-   -   [ ] Can update role permissions
-   -   [ ] Can assign roles to those lower in the role hierarchy
-   -   [ ] Can create invite codes

### Activitypub

Supported Activities

| Activity           | Action                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| `Follow`           | Send a friend request                                                                          |
| `Accept`/`Reject`  | Accept or reject a friend request                                                              |
| `Undo` -> `Follow` | Unfriend                                                                                       |
| `Delete`           | Delete a user from the database along with all their messages.                                 |
| `Block`            | Signal to the remote server that they should hide your profile from that user. Not guaranteed. |
| `Update`           | Update user details.                                                                           |

## Guilds

-   [ ] Organise channels
-   [ ] Contains a name/description and such set by it's owner/those with permission

## Channels

-   [ ] Stores messages in chronological order
-   [ ] Contains a name/description set by owner/those with permission
-   [ ] Stores pinned messages

## Administration

-   [ ] Can delete other users
-   [ ] Can ban users by IP address
-   [ ] Can suspend external/federated instances by domain
-   [ ] Can block federated instances by domain
-   [ ] TODO: Can set other instance policies

# Definitions

-   [ ] Suspending an instance means to prevent users from that instance from joining new guilds or creating new DM channels connected to your instance. It does not remove any existing connections to users/guilds of your instance. Can easily be reversed with no negative side effects.
-   [ ] Blocking an instance means to forcefully remove and prevent any connections to users/guilds between the blocked instance and this instance. It is destructive and cannot be easily be reversed.

# Helpful Activitypub Resources

## Activitypub Specification

-   [Activitystreams vocab](https://www.w3.org/TR/activitystreams-vocabulary)
-   [Activitystreams](https://www.w3.org/TR/activitystreams-core)
-   [Activitypub spec](https://www.w3.org/TR/activitypub/)

## Community posts

-   [Activitypub as it has been understood](https://flak.tedunangst.com/post/ActivityPub-as-it-has-been-understood)
-   [Guide for new ActivityPub implementers](https://socialhub.activitypub.rocks/t/guide-for-new-activitypub-implementers/479)
-   Understanding activitypub
    [part 1](https://seb.jambor.dev/posts/understanding-activitypub/),
    [part 2](https://seb.jambor.dev/posts/understanding-activitypub-part-2-lemmy/),
    [part 3](https://seb.jambor.dev/posts/understanding-activitypub-part-3-the-state-of-mastodon/)
-   [Nodejs Express Activitypub sample implementation](https://github.com/dariusk/express-activitypub)
-   [Reading Activitypub](https://tinysubversions.com/notes/reading-activitypub/#the-ultimate-tl-dr)
