#!/usr/bin/env python3
"""
Python gRPC client example for the EventService.

Run with:
    python cmd/client_python/main.py

Install dependencies first:
    pip install --extra-index-url https://buf.build/gen/python \
        jan-sykora-api-demo-audit-community-danielgtaylor-betterproto
"""

import asyncio
import sys
from datetime import timedelta

from grpclib.client import Channel
from ai.h2o.audit.v1 import Event, EventServiceStub


async def main():
    # Create a channel to connect to the server
    channel = Channel(host='127.0.0.1', port=8081)
    stub = EventServiceStub(channel)

    try:
        # Create an event
        event = Event(
            user='users/jan-sykora',
            source='ai-engine-manager',
            action='create-engine',
            execution_duration=timedelta(milliseconds=1500),
        )

        create_response = await stub.create_event(event=event)
        print(f'Created event: {create_response.event.name}')

        # List events
        list_response = await stub.list_events(page_size=10)
        print(f'Found {len(list_response.events)} events:')
        for evt in list_response.events:
            duration_ms = evt.execution_duration.total_seconds() * 1000
            print(f'  - {evt.name}: {evt.source}/{evt.action}, {evt.user} (took {duration_ms}ms)')

    finally:
        channel.close()

    return 0


if __name__ == '__main__':
    sys.exit(asyncio.run(main()))