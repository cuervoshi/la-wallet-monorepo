'use client';
import Container from '@/components/Layout/Container';
import Navbar from '@/components/Layout/Navbar';
import { MainLoader } from '@/components/Loader/Loader';
import { Button, ButtonGroup, Divider, Feedback, Flex, Heading, InputWithLabel } from '@/components/UI';
import { useTranslation } from '@/context/TranslateContext';
import { useParams, useRouter } from 'next/navigation';
import React, { ChangeEvent, useEffect, useMemo, useState } from 'react';
import LimitInput from '../components/LimitInput/LimitInput';
import { useCards, useConfig, useWalletContext } from '@lawallet/react';
import { CardPayload, CardStatus, Limit } from '@lawallet/react/types';
import useErrors from '@/hooks/useErrors';
import { regexComment, regexUserName } from '@/constants/constants';
import { useActionOnKeypress } from '@/hooks/useActionOnKeypress';

const defaultTXLimit: Limit = {
  name: 'Transactional limit',
  description: 'Spending limit per transaction',
  token: 'BTC',
  amount: BigInt(100000000000).toString(),
  delta: 0,
};

const defaultDailyLimit: Limit = {
  name: 'Daily limit',
  description: 'Spending limit per day',
  token: 'BTC',
  amount: BigInt(1000000000).toString(),
  delta: 86400,
};

type LimitsConfigOptions = 'tx' | 'daily';

const NAME_MAX_LENGTH = 20;
const DESC_MAX_LENGTH = 64;

const page = () => {
  const { t } = useTranslation();
  const [showLimit, setShowLimit] = useState<LimitsConfigOptions>('tx');
  const {
    user: { identity },
    settings,
    converter,
  } = useWalletContext();

  const errors = useErrors();
  const config = useConfig();
  const router = useRouter();
  const params = useParams();

  const uuid: string = useMemo(() => params.uuid as string, []);

  const { cardsData, cardsConfig, loadInfo, updateCardConfig } = useCards({
    privateKey: identity.data.privateKey,
    config,
  });

  const [configLimits, setConfigLimits] = useState<Record<LimitsConfigOptions, number>>({
    tx: 0,
    daily: 0,
  });

  const [newConfig, setNewConfig] = useState<CardPayload>({
    name: '',
    description: '',
    status: CardStatus.ENABLED,
    limits: [defaultTXLimit, defaultDailyLimit],
  });

  const handleChangeLimit = (e: ChangeEvent<HTMLInputElement>) => {
    const inputAmount: number = !e.target.value ? 0 : parseFloat(e.target.value);
    setConfigLimits({
      ...configLimits,
      [showLimit]: inputAmount,
    });
  };

  const handleChangeName = (e: ChangeEvent<HTMLInputElement>) => {
    errors.resetError();
    const name: string = e.target.value;

    setNewConfig({
      ...newConfig,
      name,
    });
  };

  const handleChangeDesc = (e: ChangeEvent<HTMLInputElement>) => {
    errors.resetError();
    const description: string = e.target.value;

    setNewConfig({
      ...newConfig,
      description,
    });
  };

  const handleSaveConfig = async () => {
    if (!newConfig.name.length) return errors.modifyError('EMPTY_NAME');
    if (newConfig.name.length > NAME_MAX_LENGTH)
      return errors.modifyError('MAX_LENGTH_NAME', { length: `${NAME_MAX_LENGTH}` });
    if (!regexUserName.test(newConfig.name)) return errors.modifyError('INVALID_USERNAME');

    if (newConfig.description.length > DESC_MAX_LENGTH)
      return errors.modifyError('MAX_LENGTH_DESC', { length: `${DESC_MAX_LENGTH}` });
    if (!regexComment.test(newConfig.description)) return errors.modifyError('INVALID_USERNAME');

    const updated: boolean = await updateCardConfig(uuid, {
      ...newConfig,
      limits: [
        {
          ...newConfig.limits[0],
          amount: BigInt(converter.convertCurrency(configLimits.tx, settings.props.currency, 'SAT') * 1000).toString(),
        },
        {
          ...newConfig.limits[1],
          amount: BigInt(
            converter.convertCurrency(configLimits.daily, settings.props.currency, 'SAT') * 1000,
          ).toString(),
        },
      ],
    });
    if (updated) router.push('/settings/cards');
  };

  useEffect(() => {
    if (!cardsConfig.cards?.[uuid] || !cardsData?.[uuid]) return;
    const { name, description, status, limits } = cardsConfig.cards[uuid];

    const txLimit = limits.find((limit: Limit) => {
      if (limit.delta === defaultTXLimit.delta) return limit;
    });

    const dailyLimit = limits.find((limit: Limit) => {
      if (limit.delta === defaultDailyLimit.delta) return limit;
    });

    const preloadConfig = {
      name,
      description,
      status,
      limits: [txLimit ?? defaultTXLimit, dailyLimit ?? defaultDailyLimit],
    };

    setNewConfig(preloadConfig);

    setConfigLimits({
      tx: converter.convertCurrency(Number(preloadConfig.limits[0].amount) / 1000, 'SAT', settings.props.currency),
      daily: converter.convertCurrency(Number(preloadConfig.limits[1].amount) / 1000, 'SAT', settings.props.currency),
    });
  }, [cardsConfig.cards]);

  useActionOnKeypress('Enter', handleSaveConfig, [newConfig]);

  if (!loadInfo.loading && !cardsData?.[uuid]) return null;

  return (
    <>
      <Navbar
        showBackPage={true}
        title={loadInfo.loading ? t('LOADING') : cardsData[uuid].design.name}
        overrideBack="/settings/cards"
      />

      {loadInfo.loading ? (
        <MainLoader />
      ) : (
        <Container size="small">
          <Divider y={24} />

          <InputWithLabel
            onChange={handleChangeName}
            isError={
              errors.isExactError('EMPTY_NAME') ||
              errors.isExactError('MAX_LENGTH_NAME', { length: `${NAME_MAX_LENGTH}` })
            }
            name="card-name"
            label={t('NAME')}
            placeholder={t('NAME')}
            value={newConfig.name}
          />

          <Divider y={12} />

          <InputWithLabel
            onChange={handleChangeDesc}
            isError={errors.isExactError('MAX_LENGTH_DESC', { length: `${DESC_MAX_LENGTH}` })}
            name="card-desc"
            label={t('DESCRIPTION')}
            placeholder={t('DESCRIPTION')}
            value={newConfig.description}
          />

          <Divider y={12} />

          <Flex align="center">
            <Feedback show={errors.errorInfo.visible} status={errors.errorInfo.visible ? 'error' : undefined}>
              {errors.errorInfo.text}
            </Feedback>
          </Flex>

          <Divider y={24} />

          <Flex justify="space-between" align="center">
            <Heading as="h5">{t('LIMITS')}</Heading>

            <ButtonGroup>
              <Button
                variant={showLimit === 'tx' ? 'filled' : 'borderless'}
                onClick={() => setShowLimit('tx')}
                size="small"
              >
                {t('UNIQUE')}
              </Button>

              <Button
                variant={showLimit === 'daily' ? 'filled' : 'borderless'}
                onClick={() => setShowLimit('daily')}
                size="small"
              >
                {t('DAILY')}
              </Button>
            </ButtonGroup>
          </Flex>

          <Divider y={24} />

          <LimitInput
            onChange={handleChangeLimit}
            amount={configLimits[showLimit]}
            currency={settings.props.currency}
          />

          <Divider y={24} />
        </Container>
      )}

      <Flex>
        <Container size="small">
          <Divider y={16} />
          <Flex gap={8}>
            <Button variant="bezeledGray" onClick={() => router.push('/settings/cards')}>
              {t('CANCEL')}
            </Button>
            <Button onClick={handleSaveConfig}>{t('SAVE')}</Button>
          </Flex>
          <Divider y={32} />
        </Container>
      </Flex>
    </>
  );
};

export default page;