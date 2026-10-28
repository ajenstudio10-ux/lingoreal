import { NextResponse } from 'next/server';

const PAYPAL_CLIENT = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API = process.env.NODE_ENV === 'production' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

async function getPayPalAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT}:${PAYPAL_SECRET}`).toString('base64');
  const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    body: 'grant_type=client_credentials',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  const data = await response.json();
  return data.access_token;
}

// 1. CREAR LA ORDEN
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, language, version, customPrice, productName } = body;

    const accessToken = await getPayPalAccessToken();

    const precioFinal = customPrice ? (customPrice / 100).toFixed(2) : (version === 'pro' ? '199.00' : '139.00');
    const nombreProducto = productName || `Libro LingoReal - ${language.toUpperCase()} (${version.toUpperCase()})`;

    const origin = request.headers.get('origin');

    // Construimos la URL de retorno mandando los datos necesarios para capturar después
    const returnUrl = `${origin}/${language.startsWith('paquete') ? '' : language}?success=true&email=${encodeURIComponent(email)}&version=${encodeURIComponent(version)}&lang=${encodeURIComponent(language)}`;

    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'MXN',
              value: precioFinal,
            },
            description: nombreProducto,
          },
        ],
        application_context: {
          return_url: returnUrl,
          cancel_url: `${origin}/?success=false`,
          user_action: 'PAY_NOW',
        },
      }),
    });

    const order = await response.json();

    if (!response.ok) {
      throw new Error(order.message || 'Error al conectar con PayPal');
    }

    const approvalUrl = order.links.find((link: any) => link.rel === 'approve')?.href;

    return NextResponse.json({ url: approvalUrl });
  } catch (err: any) {
    console.error('Error en PayPal Checkout:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 2. CAPTURAR EL PAGO (MÉTODO PUT)
export async function PUT(request: Request) {
  try {
    const { token } = await request.json(); // "token" es el orderID que manda PayPal

    if (!token) {
      return NextResponse.json({ error: 'Falta el token de la orden' }, { status: 400 });
    }

    const accessToken = await getPayPalAccessToken();

    // Petición crítica: Capturar el cobro en los servidores de PayPal
    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders/${token}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const captureData = await response.json();

    if (!response.ok) {
      console.error('Error al capturar orden PayPal:', captureData);
      throw new Error(captureData.message || 'Error al capturar la orden en PayPal');
    }

    return NextResponse.json({ success: true, details: captureData });
  } catch (err: any) {
    console.error('Error en Captura de PayPal:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}