/**
 * SimpleJSMQ
 *
 * Simple Javascript Message Broker System
 *
 * @author Michael Virnstein
 * @version 0.1.0
 * 
 * Copyright © 2021 Michael Virnstein
 */
let SimpleJsMQ = (function() {
	/**
	 * Class Exception
	 */
	/**
	 * Class ValueErrorException
	 */
	class ValueErrorException extends Error {
		constructor(msg) {
			super(msg);
			this.name = 'ValueErrorException';
		};
	}

	/**
	 * Class DuplicateKeyException
	 */
	class DuplicateKeyException extends Error {
		constructor(msg) {
			super(msg);
			this.name = 'DuplicateKeyException';
		};
	}

	/**
	 * Class NotFoundException
	 */
	class NotFoundException extends Error {
		constructor(msg) {
			super(msg);
			this.name = 'NotFoundException';
		};
	}

	/**
	 * Class IllegalOperationException
	 */
	class IllegalOperationException extends Error {
		constructor(msg) {s
			super(msg);
			this.name = 'IllegalOperationException';
		};
	}

	/**
	 * Class Payload
	 */
	class Payload {
		static #lastId = 0;
		#id;
		#event;
		#type;
		#data;
		
		/**
		 * Constructor
		 * @param {Event} event 
		 * @param {String} type 
		 * @param {*} data 
		 */
		constructor(event, type, data) {
			if (!(event instanceof Event)) {
				throw new ValueErrorException('event is invalid');
			}
			if (typeof type != 'string' || type.trim().length === 0) {
				throw new ValueErrorException('type is invalid');
			} 
			
			this.#id = ++Payload.#lastId;
			this.#event = event;
			this.#type = type;
			this.#data = data;
		}
		
		/**
		 * get Id
		 * @returns Integer
		 */
		getId() {
			return this.#id;
		};
		
		/**
		 * get payload type
		 * @returns String
		 */
		getType() {
			return this.#type;
		};
		
		/**
		 * get data
		 * @returns *
		 */
		getData() {
			return this.#data;
		};
		
		/**
		 * get Object copy of Event
		 * @returns Object
		 */
		getObject() {
			return {
				id: this.#id,
				event: this.#event.getObject(),
				type: this.#type,
				data: this.#data
			}
		};
	}

	/**
	 * Class Event
	 */
	class Event {
		static #lastId = 0;
		#id;
		#topic;
		#name;
		#payload;

		/**
		 * Constructor
		 * @param {Topic} topic 
		 * @param {String} eventName 
		 * @param {String} dataType 
		 * @param {*} data 
		 */
		constructor(topic, eventName, dataType, data) {
			if (!(topic instanceof Topic)) {
				throw new ValueErrorException('topic is invalid');
			}
			if (typeof eventName != 'string' || eventName.trim().length === 0) {
				throw new ValueErrorException('eventName is invalid');
			} 
			if (typeof dataType != 'string' || dataType.trim().length === 0) {
				throw new ValueErrorException('dataType is invalid');
			}
			if (data === undefined || data === null || typeof data == 'string' && data.trim().length === 0) {
				throw new ValueErrorException('data is invalid');
			}			 
			
			this.#id = ++Event.#lastId;	
			this.#topic = topic;
			this.#name = eventName.trim();
			this.#payload = new Payload(this, dataType, data);
		};
		
		/**
		 * Get Id
		 * @returns Integer
		 */
		getId() {
			return this.#id;
		};
		
		/**
		 * Get Topic
		 * @returns Topic
		 */
		getTopic() {
			return this.#topic;
		};
		
		/**
		 * Get name
		 * @returns String
		 */
		getName() {
			return this.#name;
		};
		
		/**
		 * get Payload
		 * @returns Payload
		 */
		getPayload() {
			return this.#payload;
		};
		
		/**
		 * get object copy
		 * @returns Object
		 */
		getObject() {
			return {
				id: this.#id,
				topic: this.#topic.getObject(),
				name: this.#name,
				payload: this.#payload.getObject()
			};
		};
		
	}

	/**
	 * Class Topic
	 */
	class Topic {
		static #lastId = 0;
		#id
		#name;
		#subscribers;
		#broker;
		#messageCount;
		
		/**
		 * constructor
		 * @param {String} name 
		 * @throws ValueErrorException
		 */
		constructor(name) {
			if (typeof name !== 'string' || name.trim().length === 0) {
				throw new ValueErrorException('name is invalid');
			} 
			this.#id = ++Topic.#lastId;
			this.#name = name.trim();
			this.#subscribers = {};
			this.#messageCount = 0;
		};
		
		/**
		 * get id
		 * @returns Integer
		 */ 
		getId() {
			return this.#id;
		};
		
		/**
		 * get name
		 * @returns String
		 */ 
		getName() {
			return this.#name;
		};
		
		/**
		 * get subscriber
		 * @param {String} subscriberName
		 * @returns Function|undefined
		 */ 
		getSubscriber(subscriberName) {
			if (!this.isSubscribed(subscriberName)) {
				return;
			}
			return this.#subscribers[subscriberName];
		}
		
		/**
		 * get all subscribers
		 * @returns Array
		 */ 
		getAllSubscribers() {
			return Object.assign({}, this.#subscribers);
		}
		
		/**
		 * creates a new event
		 * @param {String} eventType
		 * @param {String} dataType
		 * @param {*} data
		 * @returns Event
		 * @throws ValueErrorException
		 */
		#createEvent(eventType, dataType, data) {
			return new Event(this, eventType, dataType, data);
		};
		
		/**
		 * set broker
		 * @param {MessageBroker} broker
		 * @throws ValueErrorException
		 */
		#setBroker(broker) {
			if (broker !== undefined && !(broker instanceof MessageBroker)) {
				throw new ValueErrorException('broker is invalid');
			}
			this.#broker = broker;
		}
		
		/**
		 * get Broker
		 * @returns MessageBroker|undefined
		 */
		getBroker() {
			return this.#broker;
		};
		
		/**
		 * is managed
		 * @returns Boolean
		 */
		isManaged() {
			return this.getBroker() !== undefined;
		};
		
		/**
		 * add to a broker
		 * @param {MessageBroker} broker
		 * @throws IllegalOperationException
		 * @throws valueErrorException
		 */
		addToBroker(broker) {
			if (this.isManaged() && this.getBroker() !== broker) {
				throw new IllegalOperationException('Already registered to a MessageBroker');
			}
			let b = this.getBroker();
			this.#setBroker(broker);
			if (b === undefined) {
				broker.addTopic(this);
			}
		};
		
		/**
		 * remove from a broker
		 */
		removeFromBroker() {
			let b = this.getBroker();
			this.#setBroker(undefined);
			if (b !== undefined) {
				b.removeTopic(this.getName());
			}
		}
		
		/**
		 * Get the name of the Topic
		 * @returns String
		 */
		getName() {
			return this.#name;
		};

		/**
		 * Get number of published messages
		 * @returns Integer
		 */
		getMessageCount() {
			return this.#messageCount;
		}
		
		/**
		 * Publish sychronously
		 * @param {String} eventType
		 * @param {String} dataType
		 * @param {*} data
		 * @throws ValueErrorException
		 */
		publish (eventType, dataType, data) {
			this.publishEvent(this.#createEvent(eventType, dataType, data));
		};
		
		/**
		 * Publish sychronously
		 * @param {Event} event
		 * @throws valueErrorException
		 */
		publishEvent(event) {
			if (!(event instanceof Event)) {
				throw new ValueErrorException('Object of type Event expected');
			}
			Object.values(this.#subscribers).forEach(subscriber => {
			   subscriber(event);
			});
			++this.#messageCount;
		}
		
		/**
		 * Register event in the Topic and publish asynchronously
		 * @param {String} eventType
		 * @param {String} dataType
		 * @param {*} data
		 * @throws ValueErroException
		 */
		async register(eventType, dataType, data) {
			this.registerEvent(this.#createEvent(eventType, dataType, data), 1);
		};
		
		/**
		 * Register event in the queue and publish asynchronously
		 * @param {Event} event
		 * @throws ValueErrorException
		 */
		async registerEvent(event) {
			if (!(event instanceof Event)) {
				throw new ValueErrorException('Object of type Event expected');
			}
			setTimeout(this.publishEvent(event), 1);
		};
		
		/**
		 * Returns true iff the given object is in the list of observers
		 * @param {String} subscriberName
		 * @returns {boolean}
		 */
		isSubscribed(subscriberName) { 
			if (typeof subscriberName !== 'string' || subscriberName.trim().length === 0) {
				throw new ValueErrorException('subscriberName is invalid');
			}
			return this.#subscribers.hasOwnProperty(subscriberName.trim()); 
		};
		
		/**
		 * Adds the provided object to the observers of this observable object
		 * @param {String} subscriberName
		 * @param {Function} callback
		 * @throws ValueErrorException
		 * @throws DuplicateKeyException
		 */
		subscribe(subscriberName, callback) {
			if (typeof subscriberName !== 'string' || subscriberName.trim().length === 0) {
				throw new ValueErrorException('subscriberName is invalid');
			}
			if (typeof callback !== 'function') {
				throw new ValueErrorException('callback is not a function');
			}
			subscriberName = subscriberName.trim();
			if (this.isSubscribed(subscriberName)){
				throw new DuplicateKeyException(`Subscriber with name '${subscriberName}' already exists`);
			}
			this.#subscribers[subscriberName] = callback;
		};

		/**
		 * Removes the provided objects from the observers (if it is among them)
		 * @param {String} subscriberName
		 */
		unsubscribe(subscriberName) {
			if (this.isSubscribed(subscriberName)) {
				delete this.#subscribers[subscriberName.trim()];
			}
		};
		
		/**
		 * returns a object copy of the topic
		 * @returns Object
		 */
		getObject() {
			let subscribers = Object.keys(this.#subscribers);
			return {
				id: this.#id,
				name: this.#name,
				subscriberCount: subscribers.length,
				subscribers: subscribers,
				messageCount: this.#messageCount
			};
		};
	};

	/**
	 * Message Broker Class
	 */
	class MessageBroker {
		static #lastId = 0;
		#id;
		#name;
		#topics;
		
		/**
		 * Constructor
		 * @param {String} name 
		 */
		constructor(name) {
			if (name !== undefined && name !== null && (typeof name !== 'string' || name.trim().length === 0)) {
				throw new ValueErrorException('name is invalid');
			} 
			this.#id = ++MessageBroker.#lastId;
			this.#name = (typeof name === 'string' ? name.trim() : 'MessageBroker_'+this.#id);
			this.#topics = {};
		};
		
		/**
		 * getId	
		 * @returns Integer
		 */
		getId() {
			return this.#id;
		};
		
		/**
		 * creates a new managed Topic
		 * @param {String} topicName
		 * @returns Topic
		 */
		createTopic(topicName) {
			let topic = new Topic(topicName);
			topic.addToBroker(this);
			return topic;
		};
		
		/**
		 * creates a new managed Topic if it doesn't exists
		 * @param {String} topicName
		 * @returns Topic
		 */
		createTopicIfNotExists(topicName) {
			let topic = this.getTopic(topicName);
			if (topic === undefined) {
				topic = this.createTopic(topicName);
			}
			return topic;
		};
		
		/**
		 *  add an unmanaged topic to the broker
		 *  @param {Topic} topic
		 */
		addTopic(topic) {
			if (!(topic instanceof Topic)) {
				throw new ValueErrorException('Object of type Topic expected');
			}
			let topicName = topic.getName();
			if (this.existsTopic(topicName) && this.getTopic(topicName) !== topic) {
				throw new DuplicateKeyException(`Topic with name '${topicName}' already exists`);
			}
			let t = this.getTopic(topicName);
			this.#topics[topicName] = topic;
			if (t === undefined) {
				topic.addToBroker(this);
			}
		};
		
		/**
		 *  topic exists in broker
		 *  @param {String} topicName
		 *  @returns Boolean
		 */
		existsTopic(topicName) {
			return this.#topics.hasOwnProperty(topicName.trim());
		};
		
		/**
		 *  get a topic from broker
		 *  @param {String} topicName
		 *  @returns Topic|undefined
		 */
		getTopic(topicName) {
			if (!this.existsTopic(topicName)) {
				return;
			}
			return this.#topics[topicName.trim()];
		};
		
		/**
		 * get all topics
		 * @returns Array
		 */
		getAllTopics() {
			let t = [];
			Object.values(this.#topics).forEach(topic => t.push(topic));
			return t;
		};
		
		/**
		 *  remove a topic
		 * @param {String} topicName
		 */
		removeTopic(topicName) {
			if (this.existsTopic(topicName)) {
				let t = this.getTopic(topicName);
				delete this.#topics[topicName.trim()];
				if (t !== undefined) {
					t.removeFromBroker(this);
				}
			}
		};
		
		/**
		 * subscribe to a topic
		 * @param {String} topicName 
		 * @param {String} subscriberName 
		 * @param {Function} callback 
		 */
		subscribeToTopic(topicName, subscriberName, callback) {
			if (!this.existsTopic(topicName)) {
				this.createTopic(topicName);
			}
			this.getTopic(topicName).subscribe(subscriberName, callback);
		};
		
		/**
		 * unsubscribe to a topic
		 * @param {String} topicName 
		 * @param {String} subscriberName 
		 */
		 unsubscribeFromTopic(topicName, subscriberName) {
			if (this.existsTopic(topicName)) {
				this.getTopic(topicName).unsubscribe(subscriberName);
			}
		};
		
		/**
		 * get Topic as Object copy
		 * @returns Object
		 */
		getObject() {
			let topics = [];
			Object.values(this.#topics).forEach((t) => {
				topics.push(t.getObject());
			});;
			
			return {
				id: this.#id,
				topicCount: topics.length,
				topics: topics
			};
		};
	}
	
	/**
	 * Global Exports
	 */
	return {
		ValueErrorException: ValueErrorException,
		DuplicateKeyException: DuplicateKeyException,
		NotFoundException: NotFoundException,
		IllegalOperationException: IllegalOperationException,
		Payload: Payload,
		Event: Event,
		Topic: Topic,
		MessageBroker: MessageBroker
	};
})();