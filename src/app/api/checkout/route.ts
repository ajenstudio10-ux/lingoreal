import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, language, version, customPrice, productName, idiomasList } = body;

    // Si viene un precio personalizado (paquetes), lo usa; si no, calcula el individual
    const precio = customPrice || (version === 'pro' ? 19900 : 13900);
    const nombreProducto = productName || `Libro LingoReal - ${language.toUpperCase()} (${version.toUpperCase()})`;

    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: nombreProducto,
            },
            unit_amount: precio,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.headers.get('origin')}/?success=true`,
      cancel_url: `${request.headers.get('origin')}/?success=false`,
      metadata: {
        email,
        language,
        version,
        idiomasList: idiomasList ? JSON.stringify(idiomasList) : language,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Error en Stripe Checkout:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}