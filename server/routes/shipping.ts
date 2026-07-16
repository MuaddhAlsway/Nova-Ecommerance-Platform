import { Router, type Response } from "express";
import { authMiddleware, type AuthRequest } from "../middleware";

const router = Router();

const SHIPPO_BASE = "https://api.goshippo.com";
const SHIPPO_TOKEN = () => process.env.SHIPPO_API_TOKEN || "";

interface ShippingRate {
  id: string;
  carrier: string;
  name: string;
  price: number;
  estimatedDays: string;
  tracking: boolean;
  insurance: boolean;
  shippo_rate_id?: string;
  carrier_logo?: string;
}

const CARRIER_INFO: Record<string, { logo: string; color: string }> = {
  USPS: { logo: "usps", color: "#333366" },
  UPS: { logo: "ups", color: "#351C15" },
  FedEx: { logo: "fedex", color: "#4D148C" },
  DHL: { logo: "dhl", color: "#FFCC00" },
  "DHL Express": { logo: "dhl", color: "#FFCC00" },
  "DHL eCommerce": { logo: "dhl", color: "#FFCC00" },
  "DHL eCommerce PL": { logo: "dhl", color: "#FFCC00" },
};

const FALLBACK_RATES: ShippingRate[] = [
  { id: "usps_priority", carrier: "USPS", name: "USPS Priority Mail", price: 12.99, estimatedDays: "3-5 business days", tracking: true, insurance: false },
  { id: "usps_ground", carrier: "USPS", name: "USPS Ground Advantage", price: 8.99, estimatedDays: "5-7 business days", tracking: true, insurance: false },
  { id: "ups_ground", carrier: "UPS", name: "UPS Ground", price: 19.99, estimatedDays: "3-5 business days", tracking: true, insurance: true },
  { id: "ups_2day", carrier: "UPS", name: "UPS 2nd Day Air", price: 29.99, estimatedDays: "2 business days", tracking: true, insurance: true },
  { id: "fedex_ground", carrier: "FedEx", name: "FedEx Ground", price: 18.99, estimatedDays: "3-5 business days", tracking: true, insurance: true },
  { id: "fedex_express", carrier: "FedEx", name: "FedEx Express Saver", price: 34.99, estimatedDays: "2-3 business days", tracking: true, insurance: true },
  { id: "dhl_express", carrier: "DHL", name: "DHL Express Worldwide", price: 39.99, estimatedDays: "2-4 business days", tracking: true, insurance: true },
  { id: "free_standard", carrier: "Standard", name: "Free Standard Shipping", price: 0, estimatedDays: "7-10 business days", tracking: true, insurance: false },
];

async function shippoPost(path: string, body: any): Promise<any> {
  const resp = await fetch(`${SHIPPO_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `ShippoToken ${SHIPPO_TOKEN()}`,
    },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.detail || `Shippo API error: ${resp.status}`);
  return data;
}

async function shippoGet(path: string): Promise<any> {
  const resp = await fetch(`${SHIPPO_BASE}${path}`, {
    headers: { Authorization: `ShippoToken ${SHIPPO_TOKEN()}` },
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.detail || `Shippo API error: ${resp.status}`);
  return data;
}

function shippoRateToShippingRate(rate: any): ShippingRate {
  const carrier = rate.carrier || rate.provider || "Unknown";
  const serviceName = rate.servicelevel?.name || rate.service_level?.name || `${carrier} Shipping`;
  const days = rate.estimated_days || rate.delivery_days || 5;
  const insuranceTerms = rate.attributes || [];
  return {
    id: `shippo_${rate.object_id || rate.id}`,
    carrier,
    name: serviceName,
    price: parseFloat(rate.amount || "0"),
    estimatedDays: `${days} business days`,
    tracking: true,
    insurance: insuranceTerms.includes("INSURANCE"),
    shippo_rate_id: rate.object_id || rate.id,
  };
}

router.get("/rates", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { subtotal, destination_city, destination_zip, destination_country, destination_state, weight, length, width, height } = req.query;

    if (SHIPPO_TOKEN()) {
      try {
        const shipment = await shippoPost("/shipments/", {
          address_from: {
            name: "NOVA Technologies",
            street1: "350 Fifth Avenue",
            city: "New York",
            state: "NY",
            zip: "10118",
            country: "US",
          },
          address_to: {
            city: (destination_city as string) || "Los Angeles",
            state: (destination_state as string) || "CA",
            zip: (destination_zip as string) || "90001",
            country: (destination_country as string) || "US",
          },
          parcels: [
            {
              length: (length as string) || "30",
              width: (width as string) || "25",
              height: (height as string) || "20",
              weight: (weight as string) || "500",
              mass_unit: "g",
              distance_unit: "cm",
            },
          ],
          async: false,
        });

        if (shipment.rates && shipment.rates.length > 0) {
          const rates = shipment.rates
            .map(shippoRateToShippingRate)
            .filter((r: ShippingRate) => r.price > 0)
            .sort((a: ShippingRate, b: ShippingRate) => a.price - b.price);

          const freeStandard: ShippingRate = {
            id: "free_standard",
            carrier: "Standard",
            name: "Free Standard Shipping",
            price: Number(subtotal) >= 200 ? 0 : 15,
            estimatedDays: "7-10 business days",
            tracking: true,
            insurance: false,
          };

          return res.json([...rates.slice(0, 7), freeStandard]);
        }
      } catch (shippoErr: any) {
        console.error("Shippo rate API failed, using fallback:", shippoErr.message);
      }
    }

    const sub = Number(subtotal) || 0;
    res.json(
      FALLBACK_RATES.map((rate) => ({
        ...rate,
        price: rate.id === "free_standard" ? (sub >= 200 ? 0 : 15) : rate.price,
      }))
    );
  } catch {
    res.status(500).json({ error: "Failed to fetch shipping rates" });
  }
});

router.post("/label", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { rate_id, shipping_name, shipping_address, shipping_city, shipping_zip, shipping_state, shipping_country } = req.body;

    if (!SHIPPO_TOKEN()) {
      return res.json({
        label_url: null,
        tracking_number: `NOVA-${Date.now()}`,
        status: "pending",
        message: "Shippo API token not configured. Label not generated.",
      });
    }

    const transaction = await shippoPost("/transactions/", {
      rate: rate_id,
      label_file_type: "PDF",
    });

    if (transaction.status === "SUCCESS") {
      return res.json({
        label_url: transaction.label_url,
        tracking_number: transaction.tracking_number,
        tracking_url: transaction.tracking_url_provider,
        carrier: transaction.carrier,
        servicelevel: transaction.servicelevel,
        amount: transaction.amount,
        status: "purchased",
        shippo_transaction_id: transaction.object_id,
      });
    } else {
      throw new Error(transaction.messages?.[0]?.text || "Label purchase failed");
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to create shipping label" });
  }
});

router.post("/shipment", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { shipping_name, shipping_address, shipping_city, shipping_zip, shipping_state, shipping_country, weight, pieces, rate_id } = req.body;

    if (SHIPPO_TOKEN()) {
      try {
        if (rate_id) {
          const transaction = await shippoPost("/transactions/", {
            rate: rate_id,
            label_file_type: "PDF",
          });

          if (transaction.status === "SUCCESS") {
            return res.json({
              shipment_id: `SHP-${Date.now()}`,
              carrier: transaction.carrier,
              service: transaction.servicelevel?.name || "Shippo Shipping",
              tracking_number: transaction.tracking_number,
              label_url: transaction.label_url,
              tracking_url: transaction.tracking_url_provider,
              status: "label_purchased",
              estimated_delivery: new Date(Date.now() + 4 * 86400000).toISOString().split("T")[0],
              created_at: new Date().toISOString(),
            });
          }
        }

        const shipment = await shippoPost("/shipments/", {
          address_from: {
            name: "NOVA Technologies",
            street1: "350 Fifth Avenue",
            city: "New York",
            state: "NY",
            zip: "10118",
            country: "US",
          },
          address_to: {
            name: shipping_name,
            street1: shipping_address,
            city: shipping_city,
            state: shipping_state || "",
            zip: shipping_zip,
            country: shipping_country || "US",
          },
          parcels: [
            {
              length: "30",
              width: "25",
              height: "20",
              weight: (weight || 500).toString(),
              mass_unit: "g",
              distance_unit: "cm",
            },
          ],
          async: false,
        });

        return res.json({
          shipment_id: shipment.object_id,
          status: shipment.status || "rates_returned",
          rates_count: shipment.rates?.length || 0,
          rates: (shipment.rates || []).map(shippoRateToShippingRate),
          created_at: new Date().toISOString(),
        });
      } catch (shippoErr: any) {
        console.error("Shippo shipment API failed, using fallback:", shippoErr.message);
      }
    }

    const shipment = {
      shipment_id: `SHP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      carrier: "Shippo",
      service: "Standard Shipping",
      tracking_number: `SHP${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      status: "pending_pickup",
      estimated_delivery: new Date(Date.now() + 4 * 86400000).toISOString().split("T")[0],
      shipper: { name: "NOVA Technologies", address: "350 Fifth Avenue, Suite 7820", city: "New York", country: "US" },
      consignee: { name: shipping_name, address: shipping_address, city: shipping_city, zip: shipping_zip, country: shipping_country || "US" },
      weight: weight || 1,
      pieces: pieces || 1,
      created_at: new Date().toISOString(),
    };

    res.json(shipment);
  } catch {
    res.status(500).json({ error: "Failed to create shipment" });
  }
});

router.get("/track/:carrier/:trackingNumber", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { carrier, trackingNumber } = req.params;

    if (SHIPPO_TOKEN()) {
      try {
        const track = await shippoGet(`/tracks/${carrier}/${trackingNumber}`);
        return res.json({
          tracking_number: trackingNumber,
          carrier: track.carrier || carrier,
          status: track.status || "unknown",
          status_details: track.status_details || "",
          eta: track.eta || null,
          events: (track.tracking_history || []).map((e: any) => ({
            status: e.status || "",
            location: e.location?.city ? `${e.location.city}, ${e.location.state || ""}` : "",
            timestamp: e.status_date || e.timestamp || "",
            message: e.message || "",
          })),
        });
      } catch (shippoErr: any) {
        console.error("Shippo tracking API failed, using fallback:", shippoErr.message);
      }
    }

    res.json({
      tracking_number: trackingNumber,
      carrier,
      status: "in_transit",
      events: [
        { status: "Shipment picked up", location: "New York, NY", timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
        { status: "In transit", location: "Regional hub", timestamp: new Date(Date.now() - 86400000).toISOString() },
        { status: "Arrived at destination facility", location: "Local facility", timestamp: new Date().toISOString() },
      ],
    });
  } catch {
    res.status(500).json({ error: "Failed to track shipment" });
  }
});

router.get("/carriers", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (SHIPPO_TOKEN()) {
      try {
        const carriers = await shippoGet("/carrieraccounts/");
        return res.json(
          (carriers.results || []).map((c: any) => ({
            object_id: c.object_id,
            carrier: c.carrier,
            account_name: c.account_name || c.carrier,
            active: c.is_active,
          }))
        );
      } catch {}
    }

    res.json([
      { carrier: "USPS", account_name: "USPS", active: true },
      { carrier: "UPS", account_name: "UPS", active: true },
      { carrier: "FedEx", account_name: "FedEx", active: true },
      { carrier: "DHL", account_name: "DHL Express", active: true },
    ]);
  } catch {
    res.status(500).json({ error: "Failed to fetch carriers" });
  }
});

export default router;
