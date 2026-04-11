import { Router } from "express";

const router = Router();

import oauth_uid_confirm from "./:uid/confirm";
import oauth_uid from "./:uid/index";
import oauth_uid_login from "./:uid/login";

router.use("/oauth/:uid", oauth_uid, oauth_uid_login, oauth_uid_confirm);

export default router;
