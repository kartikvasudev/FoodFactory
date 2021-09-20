const Order = require('../../../models/order')
const moment = require('moment')
const stripe = require('stripe')('')
const nodemailer = require('nodemailer')
const sendgridTransport = require('nodemailer-sendgrid-transport')

const transporter = nodemailer.createTransport(sendgridTransport({
    auth: {
        api_key: ''
    }
}));
function orderController () {
    return {
        store(req, res) {
            // Validate request
            const { phone, address, stripeToken, paymentType } = req.body
            if(!phone || !address) {
                return res.status(422).json({ message : 'All fields are required' });
            }

            const order = new Order({
                customerId: req.user._id,
                items: req.session.cart.items,
                phone,
                address
            })
            order.save().then(result => {
                Order.populate(result, { path: 'customerId' }, (err, placedOrder) => {
                    // req.flash('success', 'Order placed successfully')

                    // Stripe payment
                    if(paymentType === 'Pay With Card') {
                        stripe.charges.create({
                            amount: req.session.cart.totalPrice  * 100,
                            source: stripeToken,
                            currency: 'inr',
                            description: `Pizza order: ${placedOrder._id} | Email : ${placedOrder.customerId.email} `
                        }).then(() => {
                            placedOrder.paymentStatus = true
                            placedOrder.paymentType = paymentType
                            placedOrder.save().then((ord) => {
                                // Emit
                                const eventEmitter = req.app.get('eventEmitter')
                                eventEmitter.emit('orderPlaced', ord)
                                delete req.session.cart
                                transporter.sendMail({
                                    to:placedOrder.customerId.email,
                                    from: 'aabhishek_be18@thapar.edu',
                                    subject: 'Order Placed Successfully' ,
                                    html: `<h1>You have successfully placed your order . Payment Completed</h1> <br> <h3> Your food will arrive soon. </h3>`
                                }).catch((err)=> {
                                    console.log(err);
                                })
                                return res.json({ message : 'Payment successful, Order placed successfully' });

                            }).catch((err) => {
                                console.log(err)
                            })

                        }).catch((err) => {
                            transporter.sendMail({
                                to:placedOrder.customerId.email,
                                from: 'aabhishek_be18@thapar.edu',
                                subject: 'Order Placed Successfully' ,
                                html: `<h1>You have successfully placed your order . Payment Failed , Pay on Delivery </h1> <br> <h3> Your food will arrive soon. </h3>`
                            }).catch((err)=> {
                                console.log(err);
                            })
                            delete req.session.cart
                            return res.json({ message : 'OrderPlaced but payment failed, You can pay at delivery time' });
                        })
                    } else {
                        transporter.sendMail({
                            to:placedOrder.customerId.email,
                            from: 'aabhishek_be18@thapar.edu',
                            subject: 'Order Placed Successfully' ,
                            html: `<h1>You have successfully placed your order . Payment to be done as COD . </h1> <br> <h3> Your food will arrive soon. </h3>`
                        }).catch((err)=> {
                            console.log(err);
                        })
                        delete req.session.cart
                        return res.json({ message : 'Order placed succesfully' });
                    }
                })
            }).catch(err => {
                return res.status(500).json({ message : 'Something went wrong' });
            })
        },
        // store(req, res) {
        //     // Validate request 

        //     const { phone, address , stripeToken , paymentType } = req.body
        //     if(!phone || !address) {
        //         return res.status(422).json({message : 'All fields are required' });
        //         // req.flash('error', 'All fields are required')
        //         // return res.redirect('/cart')
        //     }

        //     const order = new Order({
        //         customerId: req.user._id,
        //         items: req.session.cart.items,
        //         phone,
        //         address
        //     })
        //     order.save().then(result => {
        //         Order.populate(result, { path: 'customerId' }, (err, placedOrder) => {
        //             // req.flash('success', 'Order placed successfully')
        //             //Not needed as we are making a ajax call now 
        //             //Stripe Payment 
        //             console.log(placedOrder.customerId.email)
        //             if( paymentType === 'Pay With Card')
        //             {
        //                 stripe.charges.create({
        //                     amount: req.session.cart.totalPrice * 100 , //because it is in paisa
        //                     source: stripeToken,
        //                     currency: 'inr',
        //                     description: `Pizza Order : ${placedOrder._id} | ${placedOder.customerId.email} `,
        //                     }).then(()=>{
        //                     //payment successfull 
        //                     placedOrder.paymentStatus = true;
        //                     placedOrder.paymentType = paymentType;
        //                     placedOrder.save().then((ord)=>{
        //                          const eventEmitter = req.app.get('eventEmitter')
        //                          eventEmitter.emit('orderPlaced', ord)
        //                          delete req.session.cart 
        //                     })
        //                     return res.json({message : 'Payment Successfull , Order Placed Successfully'});
        //                     }).catch((err)=>{
                            
        //                     delete req.session.cart
        //                     return res.json({message : 'Payment Failed , Pay On Delivery'});
        //                 })
        //             }

        //             // Emit
        //             // return res.redirect('/customer/orders')
        //         })
        //     }).catch(err => {
        //         return res.status(500).json({message : 'Something Went Wrong '});
                
        //         // return res.redirect('/cart')
        //     })
        // },
        async index(req, res) {
            const orders = await Order.find({ customerId: req.user._id }, 
                null, 
                { sort: { 'createdAt': -1 } } )
            res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0')
            res.render('customers/orders', { orders: orders, moment: moment })
        },
        async show(req, res) {
            const order = await Order.findById(req.params.id)
            // Authorize user
            if(req.user._id.toString() === order.customerId.toString()) {
                return res.render('customers/singleOrder', { order })
            }
            return  res.redirect('/')
        }
    }
}

module.exports = orderController