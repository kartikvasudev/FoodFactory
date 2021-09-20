import axios from 'axios'
import Noty from 'noty'
import {loadStripe} from '@stripe/stripe-js';
import {placeOrder} from './apiService';
export async function initStripe() {

const stripe = await loadStripe('');
let card = null;
function mountWidget()
{
    const element = stripe.elements();

        let style = {
            base: {
            color: '#32325d',
            fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
            fontSmoothing: 'antialiased',
            fontSize: '16px',
            '::placeholder': {
                color: '#aab7c4'
            }
            },
            invalid: {
            color: '#fa755a',
            iconColor: '#fa755a'
            }
        };

    card = element.create('card' , {style , hidePostalCode:true})
    card.mount('#card-element')

}

const paymentType  = document.querySelector('#payment-type');
//Ajax Call to accept the form responses.
const paymentForm = document.querySelector('#payment-form');

if( !paymentType)
{
    return;
}
if( paymentType)
{
    paymentType.addEventListener('change' , (e)=> {
    
        if(e.target.value === 'Pay With Card' )
        {
            //Display Stripe Widget
            mountWidget();
        }
        else
        {
            console.log('Working fine');
            card.destroy();
        }
    })
}


if( paymentForm) 
{
    paymentForm.addEventListener('submit' , (e)=>{
        e.preventDefault();
        let formData = new FormData(paymentForm);
        let formObject = {};
        for( let [key , value] of formData.entries()){
            formObject[key] = value;
        }
        
        if( !card )
        {
            placeOrder(formObject);
            return;
        } 

        //verify the card

        stripe.createToken(card).then((result)=> {
            formObject.stripeToken = result.token.id;
            placeOrder(formObject);
        }).catch((err)=> {
            console.log(err);
        })



        //sending it to server from here now 


    
        
    })
}

}

