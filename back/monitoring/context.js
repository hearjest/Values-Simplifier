import {AsyncLocalStorage} from 'async_hooks';
const asyncStorage=new AsyncLocalStorage();

function getContext() {
  return asyncStorage.getStore();
}

function getRequestId() {
  const context = asyncStorage.getStore();
  return context?.requestId;
}

export {asyncStorage, getContext,getRequestId}