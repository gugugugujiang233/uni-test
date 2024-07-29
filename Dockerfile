FROM ghcr.io/foundry-rs/foundry:latest

ENTRYPOINT ["anvil", "--host", "0.0.0.0", "--block-time", "1"]