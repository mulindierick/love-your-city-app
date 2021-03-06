import { validToken } from "../middleware/validate.js";
import pool from "../db.js";
import express from "express";

const router = express.Router();

//create campaign
//  validToken,
router.post("/", validToken, async (req, res) => {
  console.log(req.body);
  const {
    userId,
    campName,
    campDesc,
    campType,
    returnedEndDate,
    deliveryAddress,
    contactNum,
    campaignItems,
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const campRes = await client.query(
      "INSERT INTO campaigns(campaign_owner_id, campaign_title, campaign_desc, campaign_type, delivery_address, end_date, contact) values ($1::uuid, $2,$3, $4, $5, $6, $7) returning campaign_id",

      [
        userId,
        campName,
        campDesc,
        campType,
        deliveryAddress,
        returnedEndDate,
        contactNum,
      ]
    );
    const campId = await campRes.rows[0]["campaign_id"];
    console.log(campId);

    for await (const item of campaignItems) {
      client.query(
        "INSERT INTO campaign_items(campaign_id, campaign_item_name, campaign_item_quantity) VALUES ($1::uuid, $2, $3)",
        [campId, item.item, item.quantity]
      );
    }

    await client.query("COMMIT");
    res.status(200).json({ msg: "campaign created", campId });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
});

// get one campaign by id -- read campaign details
router.get("/:id", async (req, res) => {
  try {
    let campaign = await pool.query(
      `select * from campaigns 
      inner join campaign_items 
      on campaigns.campaign_id = campaign_items.campaign_id 
      where campaigns.campaign_id = '${req.params.id}'
      ORDER BY campaign_items.campaign_item_name ASC`
    );
    let donations = await pool.query(
      `select donations.item_name, SUM (donations.item_quantity) as total from campaigns
      inner join donations
      on campaigns.campaign_id = donations.campaign_id 
      where campaigns.campaign_id = '${req.params.id}'
      group by donations.item_name
      ORDER BY donations.item_name ASC`
    );
    let user = await pool.query(
      `select * from users
      inner join campaigns
      on campaigns.campaign_owner_id = users.user_id
      where campaigns.campaign_id = '${req.params.id}'`
    );
    res.json({
      campaign: campaign.rows,
      donations: donations.rows,
      user: user.rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// get campaign items for you to make a donation
router.get("/items/:id", async (req, res) => {
  try {
    let campaign = await pool.query(
      `select campaign_items.campaign_item_name, campaign_items.campaign_item_quantity from campaigns 
      inner join campaign_items 
      on campaigns.campaign_id = campaign_items.campaign_id 
      where campaigns.campaign_id = '${req.params.id}'
      ORDER BY campaign_items.campaign_item_name ASC
      `
    );
    res.json(campaign.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//donate to a campaign
router.post("/:id", async (req, res) => {
  try {
    let campaign = await pool.query(
      `select * from campaigns where campaign_id = '${req.params.id}'`
    );
    if (campaign.rows.length === 0) {
      return res.json({ msg: "Campaign not found" });
    }
    console.log(req.body);
    await req.body.forEach((donation) => {
      pool.query(
        "insert into donations (campaign_id, item_name, item_quantity, first_name, second_name, email) values($1, $2, $3, $4, $5, $6)",
        [
          req.params.id,
          donation.campaign_item_name,
          donation.donation,
          donation.firstName,
          donation.secondName,
          donation.email,
        ]
      );
    });
    res.json({ msg: "Thank you for donating" });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// update a campaign
router.patch("/:id", validToken, async (req, res) => {
  try {
    console.log(req.user);
    let campaign = await pool.query(
      `select * from campaigns where campaign_id = '${req.params.id}'`
    );
    if (campaign.rows.length === 0) return res.json({ msg: "no campaign" });

    if (campaign.rows[0].campaign_owner_id === req.user.user_id) {
      await pool.query(
        `update campaigns set campaign_title = $1, campaign_desc = $2 where campaign_id = '${req.params.id}'`,
        [req.body.title, req.body.desc]
      );
      res.json({ updated: campaign.rows[0].campaign_id });
    } else {
      return res.json({ msg: "campaign not found" });
    }
  } catch (error) {
    res.json({ error: error.message });
  }
});

// delete a campaign
router.delete("/:id", validToken, async (req, res) => {
  try {
    let campaign = await pool.query(
      `select * from campaigns where campaign_id = '${req.params.id}'`
    );
    if (campaign.rows.length === 0) return res.json({ msg: "no campaign" });

    if (campaign.rows[0].campaign_owner_id === req.user.user_id) {
      await pool.query(
        `delete from campaigns where campaign_id = '${req.params.id}'`
      );
      res.json({ deleted: campaign.rows[0].campaign_id });
    } else {
      return res.json({ msg: "campaign not found" });
    }
  } catch (error) {
    res.json({ error: error.message });
  }
});

export default router;
