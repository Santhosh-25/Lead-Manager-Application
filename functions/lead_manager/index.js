"use strict";
const express = require("express");
const http = require("https");
const app = express();
app.use(express.json());
const catalyst = require("zcatalyst-sdk-node");
const HOST = "www.zohoapis.com";
const AUTH_HOST = "https://accounts.zoho.com/oauth/v2/token";
const PORT = 443;
const axios = require("axios");
const CLIENTID = "1000.3RCBPBZRAE9I8AZYZ34G5OPCIZA63H";
const CLIENT_SECRET = "d53ab585df0725578ec69f1dc521031bd21c9f642c";
app.get("/generateToken", async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const code = req.query.code;
    let userManagement = catalystApp.userManagement();
    let userDetails = await userManagement.getCurrentUser();
    const domain = `${
      process.env.X_ZOHO_CATALYST_IS_LOCAL === "true" ? "http" : "https"
    }://${
      process.env.X_ZOHO_CATALYST_IS_LOCAL === "true"
        ? req.headers.host
        : req.headers.host.split(":")[0]
    }`;
    console.log(domain);
    const refresh_token = await getRefreshToken(code, res, domain);
    console.log(refresh_token);
    const userId = userDetails.user_id;
    const catalystTable = catalystApp.datastore().table("Token");
    await catalystTable
      .insertRow({
        refresh_token,
        userId,
      })
      .then((response) => {
        console.log(response);
      })
      .catch((err) => {
        console.log(err);
      });

    res.status(200).redirect(`/#connectToCRM`);
  } catch (err) {
    console.log(err);
    res.status(500).send({
      message: "Internal Server Error. Please try again after sometime.",
      error: err,
    });
  }
});
app.get("/getUserDetails", async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const userDetails = await getUserDetails(catalystApp);
    if (userDetails.length !== 0) {
      res.status(200).send({ userId: userDetails[0].Token.userId });
    } else {
      res.status(200).send({ userId: null });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({
      message:
        "Internal Server Error in Getting User Details. Please try again after sometime.",
      error: err,
    });
  }
});
app.get("/crmData", async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const userDetails = await getUserDetails(catalystApp);
    console.log(userDetails);
    const accessToken = await getAccessToken(catalystApp, userDetails);
    const options = {
      hostname: HOST,
      method: "GET",
      path: `/crm/v2/Leads`,
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    };
    console.log(accessToken);

    //
    // var data = "";
    // const request = http.request(options, function (response) {
    //   response.on("data", function (chunk) {
    //     console.log(data);
    //     console.log(chunk);
    //     data += chunk;
    //   });
    //   response.on("end", function () {
    //     console.log(response.statusCode);
    //     res.setHeader("content-type", "application/json");
    //     console.log(data);
    //     res.status(200).send(data);
    //   });
    // });
    // request.end();
    let config = {
      method: "get",
      url: "https://www.zohoapis.com/crm/v2/Leads",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    };

    //{www.zohoapis.com,443,GET,/crm/v2/Leads,{Authorization: `Zoho-oauthtoken ${accessToken}`}}
    axios
      .request(config)
      .then((response) => {
        console.log(JSON.stringify(response.data));
        res.status(200).send(response.data);
      })
      .catch((error) => {
        console.log(error);
      });
  } catch (err) {
    console.log(err);
    res.status(500).send({
      message: "Internal Server Error. Please try again after sometime.",
    });
  }
});
app.get("/crmData/:id", async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const userDetails = await getUserDetails(catalystApp);
    const accessToken = await getAccessToken(catalystApp, userDetails);
    const options = {
      hostname: HOST,
      port: PORT,
      method: "GET",
      path: `/crm/v2/Leads/${req.params.id}`,
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    };
    var data = "";
    const request = http.request(options, function (response) {
      response.on("data", function (chunk) {
        data += chunk;
      });
      response.on("end", function () {
        res.setHeader("content-type", "application/json");
        res.status(200).send(data);
      });
    });
    request.end();
  } catch (err) {
    console.log(err);
    res.status(500).send({
      message: "Internal Server Error. Please try again after sometime.",
    });
  }
});
app.post("/crmData", async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const createData = req.body;
    console.log(req.body);
    const reqData = [];
    reqData.push(createData);
    const data = {
      data: reqData,
    };
    console.log(reqData);
    console.log(data);
    if (!createData) {
      res.status(400).send({ message: "Data Not Found" });
    }
    const userDetails = await getUserDetails(catalystApp);
    const accessToken = await getAccessToken(catalystApp, userDetails);
    // const options = {
    //   hostname: HOST,
    //   port: PORT,
    //   method: "POST",
    //   path: `/crm/v2/Leads`,
    //   headers: {
    //     Authorization: `Zoho-oauthtoken ${accessToken}`,
    //     "Content-Type": "application/json",
    //   },
    // };
    // const request = http.request(options, function (response) {
    //   res.setHeader("content-type", "application/json");
    //   response.pipe(res);
    // });
    // request.write(JSON.stringify(data));
    // request.end();

    console.log(accessToken);

    let config = {
      method: "post",
      url: "https://www.zohoapis.com/crm/v2/Leads",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
      data: data,
    };

    axios
      .request(config)
      .then((response) => {
        console.log("API Response :", JSON.stringify(response.data));
        res.status(200).send(response.data);
      })
      .catch((err) => {
        console.log(err);
      });
  } catch (err) {
    console.log("error: ", err);
    res.status(500).send({
      message: "Internal Server Error. Please try again after sometime.",
    });
  }
});
app.put("/crmData/:id", async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const updateData = req.body;
    const reqData = [];
    reqData.push(updateData);
    const data = {
      data: reqData,
    };
    if (!updateData) {
      res.status(400).send({ message: "Update Data Not Found" });
    }
    console.log(data);
    const leadID = req.params.id;
    console.log(leadID);
    const userDetails = await getUserDetails(catalystApp);
    const accessToken = await getAccessToken(catalystApp, userDetails);
    // const options = {
    //   hostname: HOST,
    //   port: PORT,
    //   method: "PUT",
    //   path: `/crm/v2/Leads/${req.params.id}`,
    //   headers: {
    //     Authorization: `Zoho-oauthtoken ${accessToken}`,
    //     "Content-Type": "application/json",
    //   },
    // };
    let config = {
      method: "put",
      maxBodyLength: Infinity,
      url: `https://www.zohoapis.com/crm/v2/Leads/${req.params.id}?`,
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
      data: data,
    };
    axios
      .request(config)
      .then((response) => {
        console.log(response.data);
        console.log("data :", data.data[0]);
        res.status(200).send(data.data[0]);
      })
      .catch((err) => {
        console.log(err);
      });
  } catch (err) {
    console.log(err);
    res.status(500).send({
      message: "Internal Server Error. Please try again after sometime.",
    });
  }
});
app.delete("/crmData/:id", async (req, res) => {
  console.log(`/crm/v2/Leads/${req.params.id}`);
  try {
    const catalystApp = catalyst.initialize(req);
    const userDetails = await getUserDetails(catalystApp);
    const accessToken = await getAccessToken(catalystApp, userDetails);
    // const options = {
    //   hostname: HOST,
    //   port: PORT,
    //   method: "DELETE",
    //   path: `/crm/v2/Leads/${req.params.id}`,
    //   headers: {
    //     Authorization: `Zoho-oauthtoken ${accessToken}`,
    //     "Content-Type": "application/json",
    //   },
    // };
    // const request = http.request(options, function (response) {
    //   res.setHeader("content-type", "application/json");
    //   response.pipe(res);
    // });
    // request.end();

    let config = {
      method: "delete",
      url: `https://www.zohoapis.com/crm/v2/Leads/${req.params.id}?`,
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    };
    axios(config)
      .then((response) => {
        console.log(JSON.stringify(response.data));
        res.status(200).send(response.data);
      })
      .catch((error) => {
        console.log(error);
      });
  } catch (err) {
    console.log(err);
    res.status(500).send({
      message: "Internal Server Error. Please try again after sometime.",
    });
  }
});
async function getAccessToken(catalystApp, userDetails) {
  console.log(userDetails[0]);
  const refresh_token = userDetails[0].Token.refresh_token;
  const userId = userDetails[0].Token.userId;

  const credentials = {
    [userId]: {
      client_id: CLIENTID,
      client_secret: CLIENT_SECRET,
      auth_url: AUTH_HOST,
      refresh_url: AUTH_HOST,
      refresh_token: refresh_token,
    },
  };

  console.log(credentials);

  const accessToken = await catalystApp
    .connection(credentials)
    .getConnector(userId)
    .getAccessToken();

  console.log("AccessToken :", accessToken);

  return accessToken;
}
async function getRefreshToken(code, res, domain) {
  try {
    const url = `${AUTH_HOST}?code=${code}&client_id=${CLIENTID}&client_secret=${CLIENT_SECRET}&grant_type=authorization_code&redirect_uri=${domain}/server/lead_manager/generateToken`;
    const response = await axios({
      method: "POST",
      url,
    });

    console.log(response);
    console.log(response.data.refresh_token);
    return response.data.refresh_token;
  } catch (err) {
    console.log(err);
    res.status(500).send({
      message: "Internal Server Error. Please try again after sometime.",
      error: err,
    });
  }
}
async function getUserDetails(catalystApp) {
  let userDetails = await catalystApp.userManagement().getCurrentUser();
  let userDetail = await catalystApp
    .zcql()
    .executeZCQLQuery(
      `SELECT * FROM Token where UserId=${userDetails.user_id}`
    );
  return userDetail;
}
module.exports = app;
