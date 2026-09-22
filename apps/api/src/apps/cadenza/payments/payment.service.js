import {positiveDecimal} from '../../../platform/money/money.js'
import {BadRequestError,NotFoundError} from '../../../common/errors/appError.js'
import {requireAppId} from '../../../platform/applications/application-scope.js'
import {getObligation,recordPayment,createCheckout} from '../../../platform/payments/payment.service.js'
import {can} from '../../../platform/authorization/authorization.service.js'
import {env} from '../../../config/index.js'
import * as repository from './payment.repository.js'
const assertOwnership=async({appId,obligationId,actorId})=>{const owner=requireAppId(appId);if(await can({userId:Number(actorId),appId:owner,resource:'cadenza_payments',action:'manage'}))return;const obligation=await getObligation(obligationId,owner);if(!obligation)throw new NotFoundError('Payment obligation not found.');const row=obligation.referenceType==='CADENZA_RENTAL'?await repository.findRental(obligation.referenceId,owner):obligation.referenceType==='CADENZA_ENROLLMENT'?await repository.findEnrollment(obligation.referenceId,owner):null;const userId=row?.customerUserId ?? row?.student?.person?.userId;if(Number(userId)!==Number(actorId))throw new NotFoundError('Payment obligation not found.')}
const pay=async({appId,obligationId,amount,currency,method,provider,providerReference,idempotencyKey,metadata,actorId})=>{const owner=requireAppId(appId);await assertOwnership({appId:owner,obligationId,actorId});let paymentAmount;try{paymentAmount=positiveDecimal(amount,'amount')}catch{throw new BadRequestError('amount must be greater than zero.')}let settledObligation=null;const payment=await recordPayment({appId:owner,obligationId,amount:paymentAmount,currency,method,provider,providerReference,idempotencyKey,metadata,actorId,onSettled:async({db,obligation,paidAmount})=>{settledObligation={...obligation,paidAmount};if(obligation.referenceType==='CADENZA_ENROLLMENT'&&obligation.status==='PAID')await repository.confirmEnrollment(obligation.referenceId,owner,db);if(obligation.referenceType==='CADENZA_RENTAL'){const rental=await repository.findRental(obligation.referenceId,owner,db);if(rental&&paidAmount.gte(rental.requiredDownPayment))await repository.reserveRental(rental.id,owner,db)}}});const obligation=settledObligation??await getObligation(obligationId,owner);if(!obligation)throw new NotFoundError('Payment obligation not found.');return {payment,obligation}}
const checkout=async({appId,obligationId,amount,description,idempotencyKey,actorId})=>{await assertOwnership({appId,obligationId,actorId});return createCheckout({
  appId:requireAppId(appId),
  obligationId,
  amount,
  provider:'XENDIT',
  description:description||'Cadenza payment',
  successUrl:env.XENDIT_SUCCESS_URL,
  cancelUrl:env.XENDIT_FAILURE_URL,
  idempotencyKey,
})}
const get=async({appId,obligationId,actorId})=>{await assertOwnership({appId,obligationId,actorId});const value=await getObligation(obligationId,requireAppId(appId));if(!value)throw new NotFoundError('Payment obligation not found.');return value}
export {pay,get,checkout}
